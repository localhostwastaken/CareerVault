import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import main as main_module
from app.main import app, require_service_secret
from app.schemas import MAX_TEXT_LENGTH


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_extract_endpoint_returns_200_for_valid_text(monkeypatch):
    # Force the heuristic path so this test is deterministic and offline, even if the local .env has a real GROQ_API_KEY configured for manual testing.
    from app import extraction

    monkeypatch.setattr(extraction._settings, "groq_api_key", "")
    with TestClient(app) as client:
        response = client.post("/extract", json={"text": "Senior Python Engineer, 5 years experience."})
        assert response.status_code == 200
        assert "python" in response.json()["skills"]


def test_extract_endpoint_rejects_oversized_text():
    with TestClient(app) as client:
        response = client.post("/extract", json={"text": "a" * (MAX_TEXT_LENGTH + 1)})
        assert response.status_code == 422


def test_service_secret_noop_when_unset():
    # Default test settings have no AI_SERVICE_SECRET configured.
    require_service_secret(x_service_secret=None)


class _FakeSettingsWithSecret:
    ai_service_secret = "shh"


def test_service_secret_rejects_mismatch(monkeypatch):
    monkeypatch.setattr(main_module, "get_settings", lambda: _FakeSettingsWithSecret())
    with pytest.raises(HTTPException) as exc_info:
        main_module.require_service_secret(x_service_secret="wrong")
    assert exc_info.value.status_code == 401


def test_service_secret_accepts_match(monkeypatch):
    monkeypatch.setattr(main_module, "get_settings", lambda: _FakeSettingsWithSecret())
    main_module.require_service_secret(x_service_secret="shh")
