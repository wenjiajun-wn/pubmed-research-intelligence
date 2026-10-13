import asyncio
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Literal
import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import AnalysisRequest
from services.analytics import analyze
from services.cache import is_demo_query, read_cache, write_cache
from services.methodology import sources
from services.pubmed import PubMedClient, PubMedError

logger = logging.getLogger(__name__)
jobs: dict[str, dict] = {}
workers: set[asyncio.Task] = set()
semaphore = asyncio.Semaphore(2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with httpx.AsyncClient() as client:
        app.state.client = client
        yield
        for task in workers:
            task.cancel()
        await asyncio.gather(*workers, return_exceptions=True)


app = FastAPI(title='PubMed Research Intelligence', version='1.0.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(','), allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])


async def run_analysis(job_id: str, request: AnalysisRequest):
    job = jobs[job_id]
    async def progress(stage, percent):
        job.update(stage=stage, progress=percent)
    async with semaphore:
        try:
            snapshot = None
            data_mode = 'live'
            fallback_warning = None
            if request.mode == 'demo':
                snapshot = read_cache(request.query, request.sample_size, demo=True)
                data_mode = 'cached_demo'
                if snapshot is None:
                    raise PubMedError('The demo cache is missing. Run python scripts/fetch_demo.py in backend first.')
            else:
                snapshot = read_cache(request.query, request.sample_size)
                if snapshot:
                    data_mode = 'cached'
                else:
                    try:
                        async with asyncio.timeout(85):
                            snapshot = await PubMedClient(app.state.client).collect(request.query, request.sample_size, progress)
                        try:
                            write_cache(snapshot, request.sample_size)
                        except OSError:
                            snapshot['warnings'].append('This result could not be saved to disk.')
                    except (PubMedError, TimeoutError, ValueError, httpx.HTTPError):
                        snapshot = read_cache(request.query, request.sample_size, allow_stale=True)
                        data_mode = 'cached'
                        if snapshot is None and is_demo_query(request.query):
                            snapshot = read_cache(request.query, request.sample_size, demo=True)
                            data_mode = 'cached_demo'
                        if snapshot is None:
                            raise PubMedError('Live retrieval failed and this query has no cache. Retry or open the Alzheimer’s sample demo.') from None
                        fallback_warning = 'Live retrieval failed. Showing a saved snapshot with its original retrieval time.'
            if request.sample_size < len(snapshot['papers']):
                snapshot['papers'] = snapshot['papers'][:request.sample_size]
            await progress('extracting', 65)
            result = analyze(snapshot)
            result.update(id=job_id, data_mode=data_mode, requested_sample_size=request.sample_size)
            if fallback_warning:
                result['warnings'].append(fallback_warning)
            await progress('ranking', 78)
            job['result'] = result
            await progress('summarizing', 88)
            from services.llm import summarize
            result.update(await summarize(result, app.state.client, use_llm=request.mode != 'demo'))
            job.update(status='completed', stage='complete', progress=100)
        except PubMedError as exc:
            job.update(status='failed', stage='failed', error=str(exc))
        except Exception:
            logger.exception('Analysis failed for job %s', job_id)
            job.update(status='failed', stage='failed', error='Analysis could not be completed. Please retry or use the sample demo.')


def get_job(job_id: str) -> dict:
    if job_id not in jobs:
        raise HTTPException(404, 'Analysis not found or expired. Run the search again.')
    return jobs[job_id]


@app.get('/api/health')
def health():
    return {'status': 'ok', 'demo_available': read_cache("Alzheimer's disease", 500, demo=True) is not None}


@app.post('/api/analyses', status_code=202)
async def create_analysis(request: AnalysisRequest):
    if request.mode == 'demo' and not is_demo_query(request.query):
        raise HTTPException(422, 'Sample Demo is available for Alzheimer’s disease only.')
    for key in list(jobs):
        if jobs[key]['status'] != 'running' and time.time() - jobs[key]['created'] > 3600:
            del jobs[key]
    if sum(j['status'] == 'running' for j in jobs.values()) >= 4:
        raise HTTPException(429, 'Analysis capacity is busy. Please retry shortly.')
    if len(jobs) >= 30:
        oldest = next((key for key, job in jobs.items() if job['status'] != 'running'), None)
        if oldest:
            del jobs[oldest]
    job_id = uuid.uuid4().hex
    jobs[job_id] = dict(id=job_id, status='running', stage='queued', progress=0, result=None, request=request.model_dump(), created=time.time())
    task = asyncio.create_task(run_analysis(job_id, request))
    workers.add(task)
    task.add_done_callback(workers.discard)
    return {'id': job_id, 'status': 'running'}


@app.get('/api/analyses/{job_id}')
def analysis_status(job_id: str):
    return {key: value for key, value in get_job(job_id).items() if key != 'created'}


@app.get('/api/analyses/{job_id}/papers')
def papers(job_id: str, sort: Literal['impact_factor', 'year', 'journal'] = 'impact_factor', offset: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=100)):
    result = get_job(job_id).get('result')
    if result is None:
        raise HTTPException(409, 'Paper analysis is still in progress.')
    items = result['papers'].copy()
    if sort == 'year':
        items.sort(key=lambda p: p['publication_year'] or 0, reverse=True)
    elif sort == 'journal':
        items.sort(key=lambda p: p['journal'].casefold())
    return {'total': len(items), 'items': items[offset:offset + limit]}


@app.get('/api/analyses/{job_id}/sources')
def data_sources(job_id: str):
    result = get_job(job_id).get('result')
    if result is None:
        raise HTTPException(409, 'Source information is still being collected.')
    return sources(result)
