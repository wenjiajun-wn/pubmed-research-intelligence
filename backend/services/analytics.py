import math
import re
from collections import Counter
from datetime import datetime

from services.countries import extract_countries
from services.journal_metrics import JournalMetrics

STOP = set('a an the and or of in on to for with by from as at into is are was were be been being we our their this that these those it its can may could has have had not also than through between using used use study studies results result conclusion conclusions methods method background objective objectives patients patient participants human humans male female aged adult adults middle young animals mice rats disease diseases treatment effect effects associated association analysis research clinical significant significantly group groups show showed based including related potential new data abstract review systematic'.split())
GENERIC = {'humans', 'male', 'female', 'aged', 'middle aged', 'adult', 'young adult', 'animals', 'mice', 'rats', 'aged 80 and over', 'case control studies', 'retrospective studies', 'prospective studies', 'follow up studies'}


def clean_phrase(text: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'[^\w\s-]', ' ', text.lower())).strip()


def paper_topics(paper: dict, query: str) -> set[str]:
    query_clean = clean_phrase(query.replace("'s", '').replace('’s', ''))
    structured = {clean_phrase(x) for x in paper['mesh_terms'] + paper['keywords']}
    structured = {x for x in structured if x not in GENERIC and x.replace('alzheimer s', 'alzheimer') != query_clean and 3 <= len(x) <= 55 and not all(t in STOP for t in x.split())}
    if len(structured) >= 3:
        return structured
    # Preserve word boundaries: punctuation/stop words break candidate phrases.
    tokens = re.findall(r'[a-z][a-z-]{2,}|[.;:,!?]', (paper['title'] + '. ' + paper['abstract'][:1800]).lower())
    for a, b in zip(tokens, tokens[1:]):
        if a not in STOP and b not in STOP and a[0].isalpha() and b[0].isalpha():
            phrase = f'{a} {b}'
            if phrase != query_clean and len(phrase) <= 45:
                structured.add(phrase)
    return structured


def rows(counter: Counter, limit: int = 20) -> list[dict]:
    return [{'name': name, 'count': count} for name, count in counter.most_common(limit)]


def analyze(snapshot: dict) -> dict:
    papers = snapshot['papers']
    reference_year = datetime.fromisoformat(snapshot['retrieved_at']).year
    metrics = JournalMetrics()
    countries, journals, topics, years = Counter(), Counter(), Counter(), Counter()
    paper_topic_sets = []
    enriched = []
    for paper in papers:
        countries.update(extract_countries(paper['affiliations']))
        journals.update([paper['journal'] or 'Unknown journal'])
        if paper['publication_year']:
            years[paper['publication_year']] += 1
        terms = paper_topics(paper, snapshot['query'])
        topics.update(terms)
        paper_topic_sets.append((paper['publication_year'], terms))
        enriched.append({**paper, **metrics.lookup(paper['journal'])})
    sample_trend = [{'year': year, 'count': count} for year, count in sorted(years.items())]
    full_counts = snapshot.get('annual_counts', [])
    trend = full_counts or sample_trend
    annual = {x['year']: x['count'] for x in full_counts}
    first, last = annual.get(reference_year - 5), annual.get(reference_year - 1)
    growth = round((last - first) / first * 100, 1) if first and last is not None else None
    top_journals = [{**r, **metrics.lookup(r['name'])} for r in rows(journals, 15)]
    eligible = [p for p in enriched if p['publication_year'] and reference_year - 5 <= p['publication_year'] <= reference_year]
    eligible.sort(key=lambda p: (p['impact_factor'] if p['impact_factor'] is not None else -1, p['publication_year'], p['pmid']), reverse=True)
    top_papers = eligible[:100]
    total_terms = sum(topics.values())
    diversity = -sum((v / total_terms) * math.log(v / total_terms) for v in topics.values()) / math.log(len(topics)) if len(topics) > 1 else None
    early, recent = Counter(), Counter()
    early_n = recent_n = 0
    for year, terms in paper_topic_sets:
        if year is None:
            continue
        if reference_year - 5 <= year < reference_year - 2:
            early.update(terms)
            early_n += 1
        elif reference_year - 2 <= year < reference_year:
            recent.update(terms)
            recent_n += 1
    emerging = None
    if min(early_n, recent_n) >= 20:
        candidates = [(name, recent[name] / recent_n - early[name] / early_n) for name in recent if recent[name] >= 5]
        if candidates:
            name, delta = max(candidates, key=lambda item: item[1])
            if delta > 0:
                emerging = {'name': name, 'change_percentage_points': round(delta * 100, 1)}
    known = Counter({k: v for k, v in countries.items() if k != 'Unknown'})
    five_year_count = snapshot.get('five_year_count')
    if type(five_year_count) is not int or five_year_count < 0:
        five_year_count = None
    return {
        'query': snapshot['query'], 'query_translation': snapshot['query_translation'],
        'retrieved_at': snapshot['retrieved_at'], 'sample_size': len(papers),
        'requested_sample_size': snapshot.get('requested_sample_size', len(papers)),
        'reference_year': reference_year, 'paper_year_start': reference_year - 5,
        'overview': {'total_publications': snapshot['total_count'],
                     'last_five_years': five_year_count,
                     'countries': len(known), 'journals': len(journals),
                     'top_topic': topics.most_common(1)[0][0] if topics else None},
        'annual_trend': trend, 'trend_scope': 'full_query' if full_counts else 'sample',
        'sample_annual_trend': sample_trend, 'countries': rows(known, 10),
        'unknown_country_count': countries['Unknown'], 'topics': rows(topics, 12),
        'word_cloud': rows(topics, 45), 'journals': top_journals, 'papers': top_papers,
        'eligible_paper_count': len(eligible), 'metric_coverage': sum(p['impact_factor'] is not None for p in eligible),
        'insights': {'publication_growth': growth, 'growth_start': reference_year - 5, 'growth_end': reference_year - 1,
                     'top_country': known.most_common(1)[0][0] if known else None,
                     'top_journal': journals.most_common(1)[0][0] if journals else None,
                     'emerging_topic': emerging, 'research_diversity': round(diversity * 100, 1) if diversity is not None else None},
        'research_themes': [], 'research_brief': [], 'summary_mode': 'pending',
        'warnings': snapshot.get('warnings', []).copy(),
    }
