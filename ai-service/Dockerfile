# Standalone image for the AI service as its own Render private service (not reachable publicly — only the CareerVault NestJS backend calls it, over Render's private network).
FROM python:3.11-slim

# LightGBM's compiled extension needs libgomp1 at runtime; python:3.11-slim doesn't ship it, so ranking would silently degrade to the weighted-sum fallback without this.
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgomp1 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Pre-cache the embedding model at build time so cold starts never hit the network for it, and HF_HUB_OFFLINE=1 keeps it that way at runtime (no accidental Hugging Face calls).
ENV HF_HOME=/app/.cache/huggingface
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
ENV HF_HUB_OFFLINE=1

COPY . .

EXPOSE 9910
# Single worker: ranking.load_model() fits-and-persists the booster once per process at startup (see app/ranking.py) — more than one worker would each re-fit it.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-9910} --workers 1"]
