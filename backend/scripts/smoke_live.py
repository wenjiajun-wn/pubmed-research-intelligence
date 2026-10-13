"""Measure a real live API analysis; run with the backend already started."""
import json
import time
from pathlib import Path
import httpx

with httpx.Client(base_url='http://127.0.0.1:8000', timeout=15) as client:
    start = time.monotonic()
    response = client.post('/api/analyses', json={'query': "Alzheimer's disease", 'sample_size': 500, 'mode': 'live'})
    response.raise_for_status()
    job_id = response.json()['id']
    previous = None
    while time.monotonic() - start < 140:
        job = client.get(f'/api/analyses/{job_id}').json()
        if job['stage'] != previous:
            previous = job['stage']
            print(job['stage'], round(time.monotonic() - start, 1), flush=True)
        if job['status'] != 'running':
            break
        time.sleep(.7)
    assert job['status'] == 'completed', job.get('error', 'timeout')
    result = job['result']
    report = { 'seconds': round(time.monotonic() - start, 2), 'mode': result['data_mode'], 'papers': result['sample_size'], 'total': result['overview']['total_publications'], 'annual_scope': result['trend_scope'], 'brief_sections': len(result['research_brief']), 'job_id': job_id }
    print(json.dumps(report))
    Path('../.impeccable/review/live-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    assert result['data_mode'] == 'live', 'Expected fresh live retrieval, got cache.'
