import asyncio
import json
from pathlib import Path
from unittest.mock import AsyncMock

import httpx
import pytest
from fastapi.testclient import TestClient
from services.analytics import analyze
from services.countries import extract_countries
from services.pubmed import parse_articles, PubMedError
from services.llm import summarize, HEADINGS
from services.journal_metrics import JournalMetrics


def sample():
    return json.loads((Path(__file__).resolve().parents[1] / 'cache' / 'alzheimers.json').read_text(encoding='utf-8'))


def test_xml_mixed_content_and_missing_fields():
    xml = '''<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID>123</PMID><Article><ArticleTitle>A <i>real</i> title</ArticleTitle><Journal><Title>Test</Title><JournalIssue><PubDate><MedlineDate>2024 Winter</MedlineDate></PubDate></JournalIssue></Journal><Abstract><AbstractText Label="RESULTS">Mixed <b>text</b>.</AbstractText></Abstract><AuthorList><Author><CollectiveName>Study group</CollectiveName></Author></AuthorList></Article></MedlineCitation><PubmedData><ArticleIdList><ArticleId IdType="doi">10.1/test</ArticleId></ArticleIdList></PubmedData></PubmedArticle></PubmedArticleSet>'''
    paper = parse_articles(xml)[0]
    assert paper['title'] == 'A real title'
    assert paper['abstract'] == 'RESULTS: Mixed text.'
    assert paper['publication_year'] == 2024
    assert paper['authors'] == ['Study group']
    assert paper['affiliations'] == []
    assert paper['doi'] == '10.1/test'
    with pytest.raises(PubMedError, match='malformed'):
        parse_articles('<broken')


def test_country_boundaries_and_collaboration():
    assert extract_countries(['University, USA', 'Another, United States', 'Paris, France']) == {'United States', 'France'}
    assert extract_countries(['Indianapolis research institute']) == {'Unknown'}
    assert extract_countries(['Belfast, Northern Ireland, UK']) == {'United Kingdom'}
    assert extract_countries(['Unknown institute, email@china.org']) == {'Unknown'}


def test_real_snapshot_and_analytics():
    snapshot = sample()
    assert len(snapshot['papers']) == 500
    assert len({p['pmid'] for p in snapshot['papers']}) == 500
    assert all(p['pmid'].isdigit() and p['title'] for p in snapshot['papers'])
    a = analyze(snapshot)
    annual = {x['year']: x['count'] for x in snapshot['annual_counts']}
    year = a['reference_year']
    assert a['overview']['last_five_years'] == snapshot.get('five_year_count')
    assert a['insights']['publication_growth'] == round((annual[year - 1] / annual[year - 5] - 1) * 100, 1)
    assert sum(j['count'] for j in a['journals']) <= 500
    assert len(a['papers']) <= 100
    assert all(year - 5 <= p['publication_year'] <= year for p in a['papers'])
    scores = [p['impact_factor'] if p['impact_factor'] is not None else -1 for p in a['papers']]
    assert scores == sorted(scores, reverse=True)
    assert a['insights']['emerging_topic'] is None


def test_missing_metrics_and_no_fake_growth():
    assert JournalMetrics().lookup('Unmapped Journal')['impact_factor'] is None
    snapshot = sample()
    snapshot['annual_counts'] = []
    snapshot.pop('five_year_count', None)
    a = analyze(snapshot)
    assert a['trend_scope'] == 'sample'
    assert a['overview']['last_five_years'] is None
    assert a['insights']['publication_growth'] is None


def test_requested_sample_size_is_independent_of_retrieved_count():
    snapshot = sample()
    snapshot['requested_sample_size'] = 1000
    snapshot['papers'] = snapshot['papers'][:217]
    result = analyze(snapshot)
    assert result['sample_size'] == 217
    assert result['requested_sample_size'] == 1000


def test_summary_offline_and_rejects_fabricated_references(monkeypatch):
    a = analyze(sample())
    async def run():
        async with httpx.AsyncClient() as client:
            offline = await summarize(a, client, False)
            assert offline['summary_mode'] == 'fallback'
            assert len(offline['research_themes']) == 5
            assert len(offline['research_brief']) == 6
            assert 400 <= sum(len(s['text']) for s in offline['research_brief']) <= 750
        monkeypatch.setenv('LLM_API_KEY', 'unit-test-key')
        payload = { 'research_themes': [{'title':'Theme','text':'Evidence text long enough','pmids':['999999999']} for _ in range(5)], 'research_brief': [{'title':h,'text':'Evidence text long enough','pmids':[]} for h in HEADINGS] }
        def handler(request):
            return httpx.Response(200, json={'choices':[{'message':{'content':json.dumps(payload)}}]})
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            result = await summarize(a, client)
            assert result['summary_mode'] == 'fallback'
            assert '未通过' in result['summary_note']
    asyncio.run(run())


def test_api_demo_fallback_and_wrong_query(monkeypatch):
    import main
    monkeypatch.setenv('LLM_API_KEY', '')
    async def wait(client, job_id):
        for _ in range(100):
            job = client.get(f'/api/analyses/{job_id}').json()
            if job['status'] != 'running':
                return job
            await asyncio.sleep(.02)
        raise AssertionError('Job did not finish')
    main.jobs.clear()
    with TestClient(main.app) as client:
        assert client.post('/api/analyses', json={'query':'  '}).status_code == 422
        assert client.post('/api/analyses', json={'query':'CRISPR','mode':'demo'}).status_code == 422
        assert client.get('/api/analyses/missing').status_code == 404
        response = client.post('/api/analyses', json={'query':"Alzheimer's disease",'mode':'demo'})
        job = asyncio.run(wait(client, response.json()['id']))
        assert job['status'] == 'completed'
        assert job['result']['data_mode'] == 'cached_demo'
        assert job['result']['summary_mode'] == 'fallback'
        assert client.get(f"/api/analyses/{job['id']}/sources").json()['retrieved'] == 500
        papers = client.get(f"/api/analyses/{job['id']}/papers?sort=year&limit=100").json()['items']
        assert [p['publication_year'] for p in papers] == sorted([p['publication_year'] for p in papers], reverse=True)
        monkeypatch.setattr(main.PubMedClient, 'collect', AsyncMock(side_effect=PubMedError('offline')))
        monkeypatch.setattr(main, 'write_cache', lambda *_: None)
        original_cache = main.read_cache
        monkeypatch.setattr(main, 'read_cache', lambda query, size, **kw: original_cache(query, size, **kw) if kw.get('demo') else None)
        response = client.post('/api/analyses', json={'query':"Alzheimer's disease",'mode':'live'})
        fallback_job = asyncio.run(wait(client, response.json()['id']))
        assert fallback_job['status'] == 'completed'
        assert fallback_job['result']['data_mode'] == 'cached_demo'
        assert any('Live retrieval failed' in w for w in fallback_job['result']['warnings'])
        response = client.post('/api/analyses', json={'query':'A topic with no cache','mode':'live'})
        failed = asyncio.run(wait(client, response.json()['id']))
        assert failed['status'] == 'failed' and failed['result'] is None
        assert failed['request'] == {'query': 'A topic with no cache', 'sample_size': 500, 'mode': 'live'}


def test_corrupted_cache_is_not_used(tmp_path, monkeypatch):
    from services import cache
    monkeypatch.setattr(cache, 'CACHE_DIR', tmp_path)
    original = sample()
    cache.write_cache(original, 500)
    assert cache.read_cache(original['query'], 500, allow_stale=True)['total_count'] > 0
    assert not list(tmp_path.glob('*.tmp'))
    corrupted = sample()
    corrupted['papers'] = [{'title': 'Missing PMID'}]
    cache.cache_path(original['query'], 500).write_text(json.dumps(corrupted), encoding='utf-8')
    assert cache.read_cache(original['query'], 500, allow_stale=True) is None
    for invalid in [[], {**original, 'annual_counts': ['invalid row']}]:
        cache.cache_path(original['query'], 500).write_text(json.dumps(invalid), encoding='utf-8')
        assert cache.read_cache(original['query'], 500, allow_stale=True) is None


def test_empty_result_completes_without_research_claims(monkeypatch):
    import main
    snapshot = sample()
    snapshot.update(query='Empty fixture query', papers=[], total_count=0, annual_counts=[])
    monkeypatch.setattr(main, 'read_cache', lambda *_args, **_kwargs: None)
    monkeypatch.setattr(main, 'write_cache', lambda *_: None)
    monkeypatch.setattr(main.PubMedClient, 'collect', AsyncMock(return_value=snapshot))
    main.jobs.clear()
    with TestClient(main.app) as client:
        job_id = client.post('/api/analyses', json={'query':'Empty fixture query'}).json()['id']
        import time
        for _ in range(100):
            job = client.get(f'/api/analyses/{job_id}').json()
            if job['status'] != 'running':
                break
            time.sleep(.02)
        assert job['status'] == 'completed'
        assert job['result']['overview']['total_publications'] == 0
        assert job['result']['research_themes'] == []
        assert job['result']['research_brief'] == []


def test_valid_llm_output_keeps_supplied_evidence(monkeypatch):
    monkeypatch.setenv('LLM_API_KEY', 'unit-test-key')
    monkeypatch.setenv('LLM_BASE_URL', 'https://api.deepseek.com')
    monkeypatch.setenv('LLM_MODEL', 'deepseek-flash')
    result = analyze(sample())
    pmid = next(p['pmid'] for p in result['papers'] if p['abstract'] and 'Published Erratum' not in p['publication_type'])
    payload = {'research_themes': [{'title':f'Theme {i}', 'text':'A carefully qualified explanation.', 'pmids':[pmid]} for i in range(5)],
               'research_brief': [{'title':h, 'text':'这是基于给定文献的简短说明，不能推断疗效。', 'pmids':[pmid]} for h in HEADINGS]}
    async def run():
        def handler(request):
            sent = json.loads(request.content)
            assert str(request.url) == 'https://api.deepseek.com/chat/completions'
            assert sent['thinking'] == {'type': 'disabled'}
            assert sent['response_format'] == {'type': 'json_object'}
            evidence = json.loads(sent['messages'][1]['content'])
            assert 'last_five_years' not in evidence['overview']
            assert result['papers'][0]['pmid'] not in {p['pmid'] for p in evidence['papers']}
            assert '所有结论只能依据' in sent['messages'][0]['content']
            assert pmid in sent['messages'][1]['content']
            return httpx.Response(200, json={'choices':[{'message':{'content':json.dumps(payload)}}]})
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            summary = await summarize(result, client)
            assert summary['summary_mode'] == 'llm'
            assert summary['research_brief'][3]['pmids'] == [pmid]
    asyncio.run(run())


@pytest.mark.parametrize('message', [None, {}, {'content': None}, {'content': {}}, {'content': ''}, {'content': '   '}])
def test_malformed_llm_message_falls_back(monkeypatch, message):
    monkeypatch.setenv('LLM_API_KEY', 'unit-test-key')
    async def run():
        transport = httpx.MockTransport(lambda request: httpx.Response(200, json={'choices': [{'message': message}]}))
        async with httpx.AsyncClient(transport=transport) as client:
            summary = await summarize(analyze(sample()), client)
            assert summary['summary_mode'] == 'fallback'
            assert len(summary['research_brief']) == 6
    asyncio.run(run())


def test_five_year_count_does_not_sum_overlapping_years():
    snapshot = sample()
    snapshot['five_year_count'] = 123
    assert analyze(snapshot)['overview']['last_five_years'] == 123
    snapshot['annual_counts'] = []
    assert analyze(snapshot)['overview']['last_five_years'] == 123
    for invalid in [None, -1, True, '123']:
        snapshot['five_year_count'] = invalid
        assert analyze(snapshot)['overview']['last_five_years'] is None
    snapshot.pop('five_year_count')
    assert analyze(snapshot)['overview']['last_five_years'] is None
    snapshot['five_year_count'] = 0
    assert analyze(snapshot)['overview']['last_five_years'] == 0


def test_collect_uses_independent_five_year_range():
    from services.pubmed import PubMedClient
    from datetime import datetime, timezone
    year = datetime.now(timezone.utc).year
    async def run():
        async with httpx.AsyncClient() as client:
            service = PubMedClient(client)
            async def search(query, limit=0, **params):
                if limit:
                    return {'count': '100', 'idlist': ['123']}
                is_range = params['mindate'] == f'{year-5}/01/01' and params['maxdate'] == f'{year-1}/12/31'
                return {'count': '37' if is_range else '10'}
            service.search = AsyncMock(side_effect=search)
            service.request = AsyncMock(return_value=httpx.Response(200, text='<PubmedArticleSet/>'))
            result = await service.collect('test', 300, AsyncMock())
            assert result['five_year_count'] == 37
            assert len(result['annual_counts']) == 11
            assert analyze(result)['overview']['last_five_years'] == 37
    asyncio.run(run())


def test_fallback_representative_excludes_notices_and_missing_abstracts():
    from services.llm import fallback, evidence_papers
    result = analyze(sample())
    assert 'Published Erratum' in result['papers'][0]['publication_type']
    expected = evidence_papers(result['papers'])[0]['pmid']
    brief = fallback(result, 'test')['research_brief'][3]
    assert brief['pmids'] == [expected]
    for kind in ['Published Erratum', 'Retracted Publication', 'Retraction of Publication', 'Expression of Concern']:
        paper = {**result['papers'][0], 'abstract': 'Some abstract', 'publication_type': [kind]}
        result['papers'] = [paper]
        assert fallback(result, 'test')['research_brief'][3]['pmids'] == []
    result['papers'] = [{**paper, 'abstract': '   ', 'publication_type': ['Journal Article']}]
    assert evidence_papers(result['papers']) == []
