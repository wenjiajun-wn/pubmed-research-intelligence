"""Run from backend: python scripts/fetch_demo.py. Downloads authentic NCBI records."""
import asyncio
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from config import CACHE_DIR
from services.pubmed import PubMedClient


async def main():
    async def progress(stage, percent):
        print(f'{stage}: {percent}%', flush=True)
    async with httpx.AsyncClient() as client:
        snapshot = await PubMedClient(client).collect("Alzheimer's disease", 500, progress)
    if not snapshot['papers']:
        raise RuntimeError('No papers retrieved; refusing to write an empty demo.')
    target = CACHE_DIR / 'alzheimers.json'
    temp = target.with_suffix('.tmp')
    temp.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding='utf-8')
    temp.replace(target)
    print(f"Saved {len(snapshot['papers'])} real papers; total {snapshot['total_count']}; {snapshot['retrieved_at']}")


if __name__ == '__main__':
    asyncio.run(main())
