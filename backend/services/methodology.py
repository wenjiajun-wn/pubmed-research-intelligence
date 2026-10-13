METHODS = [
    {'title': 'Publication counts', 'text': 'Total publications and full-query annual counts come from ESearch. The default trend spans 10 previous years and the retrieval year. The current year is incomplete. A record can have multiple publication dates; annual query totals may not exactly partition the full result set.'},
    {'title': 'Recent-paper sample', 'text': 'EFetch retrieves up to the requested number of recent records, sorted by publication date. Countries, journals, topics and papers describe this sample, not the entire field. PubMed book records are not included in article analysis.'},
    {'title': 'Five-year window', 'text': 'The KPI uses a separate ESearch date-range count for the five complete years before the retrieval year, never a sum of annual counts. Older caches without this count show N/A. Growth = (last complete year / first of those five years − 1) × 100. Top Papers follows year >= retrieval year − 5 through retrieval year; its date range is displayed explicitly.'},
    {'title': 'Countries / regions', 'text': 'Country names are matched conservatively in affiliations. A paper counts once per matched country; collaboration can make totals exceed sample size. Unmatched papers are Unknown. This is a heuristic, not geocoding.'},
    {'title': 'Topics and diversity', 'text': 'MeSH and author keywords are preferred. Title/abstract bigrams supplement sparse metadata after stopword removal. Counts are document frequencies. Diversity is normalized Shannon entropy of topic frequencies (0–100), not a quality score. Similar phrases may remain separate.'},
    {'title': 'Emerging topics', 'text': 'Compare topic prevalence in years Y−5 to Y−3 versus Y−2 to Y−1. Each period needs 20 sampled papers, and a candidate needs 5 recent papers. Recent-only samples often lack enough historical coverage; then no claim is made.'},
    {'title': 'Journal metrics and ranking', 'text': 'PubMed does not provide Journal Impact Factor. A limited local mapping uses publisher-reported metrics with source URLs and years. Missing values are N/A and sort last. Top 100 ranks the downloaded sample using journal metrics, not article citations or evidence quality.'},
    {'title': 'Research brief', 'text': 'An optional backend LLM receives supplied metadata, abstracts and statistics. Without a key or on failure, a labeled statistical brief is generated from real counts. Neither mode replaces critical appraisal or a systematic review.'},
]


def sources(result: dict) -> dict:
    return dict(provider='National Library of Medicine', database='PubMed', api='NCBI E-utilities API',
                api_url='https://eutils.ncbi.nlm.nih.gov/entrez/eutils/', query=result['query'],
                query_translation=result['query_translation'], retrieved=result['sample_size'],
                retrieved_at=result['retrieved_at'], total_count=result['overview']['total_publications'],
                data_mode=result['data_mode'], summary_mode=result['summary_mode'], methods=METHODS,
                metric_source_url='https://www.nature.com/nature-portfolio/about-journals/journal-metrics')
