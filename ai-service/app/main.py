from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import embeddings, extraction, ranking
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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "embedding_model": embeddings.model_name()}


@app.post("/extract", response_model=ExtractResponse)
def extract(req: ExtractRequest) -> ExtractResponse:
    """Structured skill extraction (Claude when keyed, heuristic otherwise)."""
    return extraction.extract(req.text)


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest) -> EmbedResponse:
    """384-dim sentence embedding (sentence-transformers, hashing fallback)."""
    return EmbedResponse(embedding=embeddings.embed(req.text))


@app.post("/rank", response_model=RankResponse)
def rank(req: RankRequest) -> RankResponse:
    """Explainable talent ranking with real SHAP contributions."""
    return ranking.rank(req.job_required_skills, req.candidates)
