import pytest
from pydantic import ValidationError

from app.config import Settings


def test_production_without_secret_refuses_to_boot():
    with pytest.raises(ValidationError, match="AI_SERVICE_SECRET is required"):
        Settings(_env_file=None, node_env="production", ai_service_secret="")


def test_production_with_secret_boots():
    settings = Settings(_env_file=None, node_env="production", ai_service_secret="shh")
    assert settings.ai_service_secret == "shh"


def test_non_production_without_secret_boots():
    settings = Settings(_env_file=None, node_env="", ai_service_secret="")
    assert settings.ai_service_secret == ""


def test_production_check_is_case_insensitive():
    with pytest.raises(ValidationError, match="AI_SERVICE_SECRET is required"):
        Settings(_env_file=None, node_env="Production", ai_service_secret="")
