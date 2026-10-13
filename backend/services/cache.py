import hashlib
import json
import uuid
from datetime import datetime, timezone
from config import CACHE_DIR, CACHE_TTL_HOURS
from models.schemas import Paper


def query_key(query: str) -> str:
    return ' '.join(query.casefold().replace('’', "'").split())


def is_demo_query(query: str) -> bool:
    return query_key(query) in {"alzheimer's disease", 'alzheimer disease', 'alzheimers disease'}


def cache_path(query: str, size: int):
    key = hashlib.sha256(f'{query_key(query)}:{size}'.encode()).hexdigest()[:24]
    return CACHE_DIR / f'query_{key}.json'


def read_cache(query: str, size: int, allow_stale: bool = False, demo: bool = False) -> dict | None:
    path = CACHE_DIR / 'alzheimers.json' if demo else cache_path(query, size)
    try:
        snapshot = json.loads(path.read_text(encoding='utf-8'))
        if not isinstance(snapshot, dict):
            return None
        age = datetime.now(timezone.utc) - datetime.fromisoformat(snapshot['retrieved_at'])
        if not (allow_stale or demo) and age.total_seconds() > CACHE_TTL_HOURS * 3600:
            return None
        if not isinstance(snapshot['papers'], list) or 'total_count' not in snapshot:
            return None
        for field in ('query', 'query_translation', 'retrieved_at'):
            if not isinstance(snapshot[field], str):
                return None
        if not isinstance(snapshot['total_count'], int) or snapshot['total_count'] < 0:
            return None
        if demo:
            if not is_demo_query(snapshot['query']):
                return None
        elif query_key(snapshot['query']) != query_key(query):
            return None
        snapshot['papers'] = [Paper.model_validate(p).model_dump() for p in snapshot['papers']]
        counts = snapshot.get('annual_counts', [])
        if not isinstance(counts, list) or any(not isinstance(r, dict) or not isinstance(r.get('year'), int) or not isinstance(r.get('count'), int) for r in counts):
            return None
        return snapshot
    except (OSError, ValueError, KeyError, TypeError):
        return None


def write_cache(snapshot: dict, size: int):
    target = cache_path(snapshot['query'], size)
    temp = target.with_suffix(f'.{uuid.uuid4().hex}.tmp')
    try:
        temp.write_text(json.dumps(snapshot, ensure_ascii=False), encoding='utf-8')
        temp.replace(target)
    finally:
        temp.unlink(missing_ok=True)
