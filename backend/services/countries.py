"""Conservative affiliation matching; counts are paper-country memberships."""
import re

ALIASES = {
    'United States': [r'united states(?: of america)?', r'u\.?s\.?a\.?', r'usa'],
    'China': [r'china', r'people.?s republic of china'],
    'United Kingdom': [r'united kingdom', r'uk', r'england', r'scotland', r'wales', r'northern ireland'],
    'Germany': [r'germany', r'deutschland'], 'Japan': [r'japan'],
    'Canada': [r'canada'], 'France': [r'france'], 'Australia': [r'australia'],
    'Italy': [r'italy', r'italia'], 'Spain': [r'spain', r'españa'],
    'Netherlands': [r'netherlands'], 'Sweden': [r'sweden'],
    'Switzerland': [r'switzerland'], 'South Korea': [r'south korea', r'republic of korea', r'korea'],
    'India': [r'india'], 'Brazil': [r'brazil', r'brasil'],
    'Taiwan': [r'taiwan'], 'Hong Kong': [r'hong kong'],
    'Singapore': [r'singapore'], 'Israel': [r'israel'],
    'Belgium': [r'belgium'], 'Denmark': [r'denmark'],
    'Finland': [r'finland'], 'Norway': [r'norway'],
    'Austria': [r'austria'], 'Portugal': [r'portugal'],
    'Poland': [r'poland'], 'Greece': [r'greece'],
    'Turkey': [r'turkey', r'türkiye'], 'Iran': [r'iran'],
    'Saudi Arabia': [r'saudi arabia'], 'Egypt': [r'egypt'],
    'Mexico': [r'mexico'], 'New Zealand': [r'new zealand'],
    'Ireland': [r'ireland'], 'South Africa': [r'south africa'],
    'Argentina': [r'argentina'], 'Chile': [r'chile'],
    'Pakistan': [r'pakistan'], 'Malaysia': [r'malaysia'],
    'Thailand': [r'thailand'], 'Indonesia': [r'indonesia'],
    'Russia': [r'russia', r'russian federation'], 'Czech Republic': [r'czech republic', r'czechia'],
}
PATTERNS = {country: re.compile(r'\b(?:' + '|'.join(aliases) + r')\b', re.I) for country, aliases in ALIASES.items()}


def extract_countries(affiliations: list[str]) -> set[str]:
    countries = set()
    for affiliation in affiliations:
        # E-mail domains are not reliable evidence of institutional geography.
        text = re.sub(r'\S+@\S+', '', affiliation)
        found = {name for name, pattern in PATTERNS.items() if pattern.search(text)}
        if 'United Kingdom' in found and re.search(r'northern ireland', text, re.I):
            found.discard('Ireland')
        # Region-specific affiliation labels take precedence within an affiliation.
        if found & {'Hong Kong', 'Taiwan'}:
            found.discard('China')
        countries.update(found)
    return countries or {'Unknown'}
