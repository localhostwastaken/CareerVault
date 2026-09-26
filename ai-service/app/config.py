from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Validated environment configuration."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 9910
    # Mirrors the NestJS server's NODE_ENV so this service can tell a real deploy from
    # local/dev without a separate flag. Only used to gate the production check below.
    node_env: str = ""
    # Shared secret with the NestJS backend (X-Service-Secret header). Empty disables the
    # check — fine for local dev where this only ever binds to localhost; required in
    # production (see _require_secret_in_production) once the service is reachable from
    # outside the backend's own host.
    ai_service_secret: str = ""
    # Skill extraction: Groq (OpenAI-compatible LLM API) when keyed, else a heuristic.
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384

    @model_validator(mode="after")
    def _require_secret_in_production(self) -> "Settings":
        # Fail fast at boot, not on the first request: an unauthenticated /extract,
        # /embed or /rank reachable over the network is a real exposure, not a config nit.
        if self.node_env.lower() == "production" and not self.ai_service_secret:
            raise ValueError(
                "AI_SERVICE_SECRET is required when NODE_ENV=production — refusing to "
                "boot with request authentication disabled."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
