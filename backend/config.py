import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT.parent / '.env')
load_dotenv(ROOT / '.env')
CACHE_DIR = Path(os.getenv('CACHE_DIR', str(ROOT / 'cache')))
CACHE_DIR.mkdir(exist_ok=True)
NCBI_API_KEY = os.getenv('NCBI_API_KEY', '')
NCBI_EMAIL = os.getenv('NCBI_EMAIL', '')
CACHE_TTL_HOURS = float(os.getenv('CACHE_TTL_HOURS', '24'))
