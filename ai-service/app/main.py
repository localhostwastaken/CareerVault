from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException

from . import embeddings, extraction, ranking
from .config import get_settings
from .schemas import (
    EmbedRequest,
    EmbedResponse,
    ExtractRequest,
    ExtractResponse,
    RankRequest,
    RankResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load (or, on first ever boot, fit-and-persist) the ranking model once per worker
    # process at startup — never at import — so extra uvicorn workers don't each re-train.
    ranking.load_model()
    yield


app = FastAPI(title="CareerVault AI Service", version="1.0.0", lifespan=lifespan)


def require_service_secret(x_service_secret: str | None = Header(default=None)) -> None:
    """Shared secret with the NestJS backend. No-op if AI_SERVICE_SECRET is unset."""
    secret = get_settings().ai_service_secret
    if secret and x_service_secret != secret:
        raise HTTPException(status_code=401, detail="Invalid or missing service secret")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "embedding_model": embeddings.model_name()}


@app.post("/extract", response_model=ExtractResponse, dependencies=[Depends(require_service_secret)])
def extract(req: ExtractRequest) -> ExtractResponse:
    """Structured skill extraction (Groq when keyed, heuristic otherwise)."""
    return extraction.extract(req.text)


@app.post("/embed", response_model=EmbedResponse, dependencies=[Depends(require_service_secret)])
def embed(req: EmbedRequest) -> EmbedResponse:
    """384-dim sentence embedding (sentence-transformers, hashing fallback)."""
    return EmbedResponse(embedding=embeddings.embed(req.text))


@app.post("/rank", response_model=RankResponse, dependencies=[Depends(require_service_secret)])
def rank(req: RankRequest) -> RankResponse:
    """Explainable talent ranking with real SHAP contributions."""
    return ranking.rank(req.job_required_skills, req.candidates)
