from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated environment configuration."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 9910
    # Shared secret with the NestJS backend (X-Service-Secret header). Empty disables the check — fine for local dev where this only ever binds to localhost; set it once this service is reachable from outside the backend's own host.
    ai_service_secret: str = ""
    # Skill extraction: Groq (OpenAI-compatible LLM API) when keyed, else a heuristic.
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384


@lru_cache
def get_settings() -> Settings:
    return Settings()
