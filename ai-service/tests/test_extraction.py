from app import extraction


def test_heuristic_extracts_skills_seniority_and_years():
    text = "Senior Software Engineer with 6 years of experience in Python, React, and AWS."
    result = extraction._heuristic(text)
    assert "python" in result.skills
    assert "react" in result.skills
    assert "aws" in result.skills
    assert result.seniority == "SENIOR"
    assert result.years_of_experience == 6


def test_extract_uses_heuristic_when_no_groq_key(monkeypatch):
    # Force the no-key path explicitly rather than asserting on the ambient .env, which may have a real GROQ_API_KEY configured for manual testing.
    monkeypatch.setattr(extraction._settings, "groq_api_key", "")
    result = extraction.extract("Junior Data Analyst skilled in SQL and Excel.")
    assert result.seniority == "JUNIOR"
    assert "sql" in result.skills


def _raise_runtime_error(*_args, **_kwargs):
    raise RuntimeError("groq unavailable")


def test_extract_falls_back_to_heuristic_when_groq_fails(monkeypatch):
    monkeypatch.setattr(extraction._settings, "groq_api_key", "fake-key")
    monkeypatch.setattr(extraction, "_groq", _raise_runtime_error)
    result = extraction.extract("Experienced Java developer with strong leadership skills.")
    assert "java" in result.skills
