# CareerVault AI Service

FastAPI service for skill extraction, embeddings, and explainable talent ranking
(SHAP). Stateless compute — the NestJS server owns the database and pgvector
retrieval and calls this over HTTP via its `AiClient` adapter.

## Run (skeleton)

```bash
cd ai-service
python3 -m venv .venv && source .venv/bin/activate
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings
uvicorn app.main:app --reload --port 9910
# http://localhost:9910/health
```

Phase 5 installs the full `requirements.txt` (Claude, sentence-transformers,
LightGBM, SHAP) and replaces the stub endpoint bodies with real implementations.
The request/response shapes in `app/schemas.py` are the locked contract.

## Endpoints
- `GET /health`
- `POST /extract` — document text → structured skills
- `POST /embed` — text → 384-dim vector
- `POST /rank` — job + candidate features → ranked matches with SHAP contributions
