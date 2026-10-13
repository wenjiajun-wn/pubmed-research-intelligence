from typing import Literal
from pydantic import BaseModel, Field, field_validator


class AnalysisRequest(BaseModel):
    query: str = Field(min_length=2, max_length=300)
    sample_size: int = Field(default=500, ge=300, le=1000)
    mode: Literal['live', 'demo'] = 'live'

    @field_validator('query')
    @classmethod
    def clean_query(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError('Enter at least two characters.')
        return value


class Paper(BaseModel):
    pmid: str
    title: str
    abstract: str = ''
    authors: list[str] = Field(default_factory=list)
    journal: str = ''
    publication_date: str = ''
    publication_year: int | None = None
    affiliations: list[str] = Field(default_factory=list)
    doi: str | None = None
    publication_type: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    mesh_terms: list[str] = Field(default_factory=list)
    issn: str | None = None
