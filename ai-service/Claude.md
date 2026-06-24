# CareerVault — AI Service Rules (Python / FastAPI)

Binding for `ai-service/`. Stateless ML compute for skill extraction, embeddings,
and explainable talent ranking. It never touches the database — the NestJS server
owns all persistence and pgvector retrieval and calls this over HTTP.

## Stack
- Python 3.12 · FastAPI · Pydantic v2 · `pydantic-settings` (env validation).
- Skill extraction: **Groq** (OpenAI-compatible LLM API, `llama-3.3-70b-versatile`) over
  httpx when `GROQ_API_KEY` is set, else a deterministic heuristic. No Claude/Anthropic.
- Embeddings: sentence-transformers (`all-MiniLM-L6-v2`, 384-dim), hashing fallback.
- Ranking: LightGBM regressor explained with its **native TreeSHAP** (`predict(pred_contrib=True)`),
  not the `shap` package (which segfaults under uvicorn workers). numpy.
- macOS: needs `brew install libomp`; `KMP_DUPLICATE_LIB_OK=TRUE` is set in `app/__init__.py`.

## Contract (do not break)
- The request/response models in `app/schemas.py` are the locked contract shared with
  `server/src/services/ai/ai-client.service.ts`. Change both sides together.
- Endpoints: `GET /health`, `POST /extract`, `POST /embed`, `POST /rank`. Keep them pure
  request→response; no hidden state, no DB.
- `/rank` must return per-feature SHAP contributions; the client renders them as the
  explainability panel. Contributions + base_value must reconcile to match_score.

## Rules
- Type everything (Pydantic models + function annotations). No bare dicts across the API.
- Heavy models load once at startup (module-level singletons), never per request.
- Secrets via `app/config.Settings` only (env). Never hardcode API keys.
- Mark unfinished real implementations with `NOTE(phase5)` and keep a working typed stub
  so the end-to-end system stays runnable.
- Privacy: only process a holder's document text when extraction consent is set; the
  server enforces consent before calling `/extract`.

## Commands
- Dev: `uvicorn app.main:app --reload --port 9910`
- Full deps: `pip install -r requirements.txt`
