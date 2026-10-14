"""NCBI access, rate limiting, retries and defensive PubMed XML parsing."""
import asyncio
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from collections.abc import Awaitable, Callable

import httpx
from config import NCBI_API_KEY, NCBI_EMAIL
from models.schemas import Paper

BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/'
_lock = asyncio.Lock()
_last_request = 0.0
Progress = Callable[[str, int], Awaitable[None]]


class PubMedError(Exception):
    pass


async def pace():
    global _last_request
    async with _lock:
        interval = 0.12 if NCBI_API_KEY else 0.36
        await asyncio.sleep(max(0, interval - (time.monotonic() - _last_request)))
        _last_request = time.monotonic()


def node_text(node: ET.Element | None) -> str:
    return ''.join(node.itertext()).strip() if node is not None else ''


def parse_articles(xml: str) -> list[dict]:
    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        raise PubMedError('NCBI returned malformed article metadata. Please retry or use the cached demo.') from None
    error = root.find('.//ERROR')
    if error is not None:
        raise PubMedError(node_text(error))
    papers = {}
    for item in root.findall('.//PubmedArticle'):
        article = item.find('./MedlineCitation/Article')
        if article is None:
            continue
        pmid = node_text(item.find('./MedlineCitation/PMID'))
        if not pmid:
            continue
        date = article.find('./Journal/JournalIssue/PubDate')
        year_text = node_text(date.find('Year')) if date is not None else ''
        if not year_text and date is not None:
            year_text = node_text(date.find('MedlineDate'))
        if not year_text:
            year_text = node_text(article.find('./ArticleDate/Year'))
        match = re.search(r'\b(19\d{2}|20\d{2})\b', year_text)
        year = int(match.group()) if match else None
        authors = []
        for author in article.findall('./AuthorList/Author'):
            collective = node_text(author.find('CollectiveName'))
            name = ' '.join(filter(None, [node_text(author.find('ForeName')), node_text(author.find('LastName'))]))
            if collective or name:
                authors.append(collective or name)
        abstract = []
        for part in article.findall('./Abstract/AbstractText'):
            label = part.get('Label', '')
            abstract.append((label + ': ' if label else '') + node_text(part))
        doi = next((node_text(n) for n in item.findall('./PubmedData/ArticleIdList/ArticleId') if n.get('IdType') == 'doi'), None)
        papers[pmid] = Paper(
            pmid=pmid, title=node_text(article.find('ArticleTitle')),
            abstract='\n'.join(abstract), authors=authors,
            journal=node_text(article.find('./Journal/Title')),
            publication_date=' '.join(date.itertext()).strip() if date is not None else str(year or ''),
            publication_year=year,
            affiliations=list(dict.fromkeys(node_text(n) for n in article.findall('.//Affiliation') if node_text(n))),
            doi=doi, publication_type=[node_text(n) for n in article.findall('./PublicationTypeList/PublicationType')],
            keywords=[node_text(n) for n in item.findall('./MedlineCitation/KeywordList/Keyword')],
            mesh_terms=[node_text(n) for n in item.findall('./MedlineCitation/MeshHeadingList/MeshHeading/DescriptorName')],
            issn=node_text(article.find('./Journal/ISSN')) or None,
        ).model_dump()
    return list(papers.values())


class PubMedClient:
    def __init__(self, client: httpx.AsyncClient):
        self.client = client

    async def request(self, endpoint: str, **params) -> httpx.Response:
        params.update(db='pubmed', tool='pubmed_research_intelligence')
        if NCBI_API_KEY:
            params['api_key'] = NCBI_API_KEY
        if NCBI_EMAIL:
            params['email'] = NCBI_EMAIL
        for attempt in range(3):
            await pace()
            try:
                response = await self.client.get(BASE + endpoint, params=params, timeout=15)
                if response.status_code == 429 or response.status_code >= 500:
                    if attempt < 2:
                        await asyncio.sleep(1.5 * (2 ** attempt))
                        continue
                response.raise_for_status()
                return response
            except (httpx.TimeoutException, httpx.NetworkError):
                if attempt == 2:
                    raise PubMedError('NCBI is unreachable or timed out. Please retry or use the cached demo.') from None
                await asyncio.sleep(1.5 * (2 ** attempt))
            except httpx.HTTPStatusError:
                raise PubMedError('NCBI returned an upstream error. Please retry or use the cached demo.') from None
        raise PubMedError('NCBI request failed.')

    async def search(self, query: str, limit: int = 0, **params) -> dict:
        response = await self.request('esearch.fcgi', term=query, retmax=limit, retmode='json', **params)
        payload = response.json()
        if 'error' in payload or 'esearchresult' not in payload:
            raise PubMedError('NCBI could not process this query.')
        result = payload['esearchresult']
        if result.get('ERROR'):
            raise PubMedError('NCBI could not process this query.')
        return result

    async def collect(self, query: str, limit: int, progress: Progress) -> dict:
        await progress('searching', 5)
        search = await self.search(query, limit, sort='pub date')
        ids = search.get('idlist', [])
        now = datetime.now(timezone.utc)
        snapshot = dict(query=query, query_translation=search.get('querytranslation', query),
                        total_count=int(search['count']), retrieved_at=now.isoformat(),
                        requested_sample_size=limit, papers=[], annual_counts=[],
                        annual_counts_scope='full_query', source='NCBI PubMed E-utilities', warnings=[])
        if not ids:
            snapshot['five_year_count'] = 0
            return snapshot
        await progress('collecting', 15)
        for start in range(0, len(ids), 100):
            response = await self.request('efetch.fcgi', id=','.join(ids[start:start + 100]), retmode='xml')
            snapshot['papers'].extend(parse_articles(response.text))
            await progress('collecting', 15 + int(35 * min(start + 100, len(ids)) / len(ids)))
        snapshot['papers'] = list({p['pmid']: p for p in snapshot['papers']}.values())
        if len(snapshot['papers']) < len(ids):
            snapshot['warnings'].append('Some returned records were unavailable or not supported journal-article records.')
        await progress('analyzing', 52)
        try:
            count = await self.search(query, datetype='pdat', mindate=f'{now.year - 5}/01/01', maxdate=f'{now.year - 1}/12/31')
            snapshot['five_year_count'] = int(count['count'])
            snapshot['five_year_count_retrieved_at'] = datetime.now(timezone.utc).isoformat()
        except (PubMedError, ValueError, httpx.HTTPError):
            snapshot['five_year_count'] = None
        # Counts are independent from the recent-paper sample and contain no full records.
        try:
            for year in range(now.year - 10, now.year + 1):
                count = await self.search(query, datetype='pdat', mindate=f'{year}/01/01', maxdate=f'{year}/12/31')
                snapshot['annual_counts'].append({'year': year, 'count': int(count['count'])})
                await progress('analyzing', 52 + int(8 * (year - (now.year - 10) + 1) / 11))
        except (PubMedError, ValueError):
            snapshot['annual_counts'] = []
            snapshot['annual_counts_scope'] = 'unavailable'
            snapshot['warnings'].append('Full-query annual counts unavailable; trend shows the recent sample only.')
        return snapshot
