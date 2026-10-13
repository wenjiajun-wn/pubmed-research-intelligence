import csv
import re
from pathlib import Path


def normalize(name: str) -> str:
    return re.sub(r'[^a-z0-9]', '', name.lower().replace('&', 'and'))


class JournalMetrics:
    def __init__(self, path: Path | None = None):
        path = path or Path(__file__).resolve().parents[1] / 'data' / 'journal_metrics.csv'
        self.metrics = {}
        if path.exists():
            with path.open(encoding='utf-8-sig', newline='') as source:
                for row in csv.DictReader(source):
                    try:
                        value = float(row['impact_factor'])
                    except (ValueError, KeyError):
                        continue
                    entry = dict(impact_factor=value, metric_source=row.get('metric_source') or 'Local mapping',
                                 metric_year=row.get('metric_year') or None, metric_url=row.get('metric_url') or None)
                    for name in [row['journal'], *row.get('aliases', '').split('|')]:
                        if name:
                            self.metrics[normalize(name)] = entry

    def lookup(self, journal: str) -> dict:
        return self.metrics.get(normalize(journal), dict(impact_factor=None, metric_source=None, metric_year=None, metric_url=None)).copy()
