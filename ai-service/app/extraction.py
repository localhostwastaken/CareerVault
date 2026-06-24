"""Structured skill extraction from document text.

Primary: Claude (when ANTHROPIC_API_KEY is set) for high-quality structured output.
Fallback: a deterministic vocabulary + heuristic parser, so extraction is useful even
without an API key. The server only calls this once the holder has consented.
"""

from __future__ import annotations

import json
import re

from .config import get_settings
from .schemas import ExtractResponse

_settings = get_settings()

# Curated vocabulary for the heuristic path. Phrases are matched case-insensitively as
# whole words; this is intentionally broad-but-finite rather than open-vocabulary.
_SKILL_VOCAB = [
    "python", "java", "javascript", "typescript", "go", "rust", "c++", "c#", "ruby",
    "react", "angular", "vue", "node.js", "nest.js", "django", "flask", "spring",
    "postgresql", "mysql", "mongodb", "redis", "kafka", "rabbitmq", "elasticsearch",
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ci/cd", "graphql",
    "rest", "microservices", "machine learning", "deep learning", "nlp", "pytorch",
    "tensorflow", "data analysis", "sql", "tableau", "power bi", "excel",
    "product management", "project management", "agile", "scrum", "leadership",
    "communication", "stakeholder management", "team management", "hiring",
    "system design", "distributed systems", "security", "devops", "sre",
    "accounting", "finance", "marketing", "sales", "operations", "strategy",
]

_SENIORITY_RULES = [
    ("LEAD", ("principal", "staff", "lead", "head", "director", "vp", "chief")),
    ("SENIOR", ("senior", "sr")),
    ("MID", ("mid-level", "mid level", "intermediate", "mid")),
    ("JUNIOR", ("junior", "jr", "intern", "trainee", "associate", "entry-level", "entry level")),
]

_INDUSTRY_VOCAB = [
    "fintech", "healthcare", "e-commerce", "education", "saas", "gaming",
    "logistics", "manufacturing", "consulting", "media", "telecom", "retail",
]

# Left boundary so "120 years" isn't read as "20 years".
_YEARS_RE = re.compile(r"(?<!\d)(\d{1,2})\s*\+?\s*years?", re.IGNORECASE)
_TITLE_RE = re.compile(
    r"\b((?:senior|junior|lead|principal|staff)?\s*(?:software|data|product|project|"
    r"machine learning|backend|frontend|full[- ]?stack)?\s*"
    r"(?:engineer|developer|manager|analyst|scientist|designer|architect|consultant))\b",
    re.IGNORECASE,
)


def _has_term(lowered: str, term: str) -> bool:
    return re.search(r"(?<![a-z0-9])" + re.escape(term.lower()) + r"(?![a-z0-9])", lowered) is not None


def _match_terms(text: str, vocab: list[str]) -> list[str]:
    lowered = text.lower()
    return [term for term in vocab if _has_term(lowered, term)]


def _heuristic(text: str) -> ExtractResponse:
    skills = _match_terms(text, _SKILL_VOCAB)
    industries = _match_terms(text, _INDUSTRY_VOCAB)

    lowered = text.lower()
    seniority = None
    for label, cues in _SENIORITY_RULES:
        if any(_has_term(lowered, cue) for cue in cues):
            seniority = label
            break

    years_match = _YEARS_RE.search(text)
    years = int(years_match.group(1)) if years_match else None
    if years is not None and (years < 1 or years > 60):
        years = None

    title_match = _TITLE_RE.search(text)
    job_title = re.sub(r"\s+", " ", title_match.group(1)).strip().title() if title_match else None

    return ExtractResponse(
        skills=skills,
        job_title=job_title,
        seniority=seniority,
        years_of_experience=years,
        certifications=[],
        industries=industries,
        confidence_scores={skill: 0.6 for skill in skills},
    )


_EXTRACTION_INSTRUCTIONS = (
    "Extract structured career data from the document below. Respond with ONLY a JSON "
    "object with keys: skills (string[]), job_title (string|null), seniority (one of "
    "JUNIOR, MID, SENIOR, LEAD, or null), years_of_experience (int|null), certifications "
    "(string[]), industries (string[]), confidence_scores (object mapping each skill to a "
    "0-1 number).\n\nDOCUMENT:\n"
)


def _parse_json_object(raw: str) -> dict:
    return json.loads(raw[raw.index("{") : raw.rindex("}") + 1])


def _groq(text: str) -> ExtractResponse:
    import httpx

    response = httpx.post(
        f"{_settings.groq_base_url}/chat/completions",
        headers={"Authorization": f"Bearer {_settings.groq_api_key}", "content-type": "application/json"},
        json={
            "model": _settings.groq_model,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": "You extract structured career data and reply with JSON only."},
                {"role": "user", "content": _EXTRACTION_INSTRUCTIONS + text},
            ],
        },
        timeout=30.0,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    return ExtractResponse(**_parse_json_object(content))


def extract(text: str) -> ExtractResponse:
    # Groq when keyed, otherwise the heuristic. Any provider failure (bad key, rate
    # limit, malformed JSON) falls through to the heuristic so extraction never 500s.
    if _settings.groq_api_key:
        try:
            return _groq(text)
        except Exception:  # noqa: BLE001
            pass
    return _heuristic(text)
