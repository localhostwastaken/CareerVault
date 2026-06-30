# ── Stage 1: Build NestJS ─────────────────────────────────────────────────────
FROM node:20-slim AS server-build

WORKDIR /build/server
COPY server/package*.json server/prisma.config.ts ./
RUN npm ci
COPY server/ .
RUN npx prisma generate && npm run build

# ── Stage 2: Runtime (Node 20 + Python 3.11 in one container) ─────────────────
FROM python:3.11-slim

# Install Node.js 20
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ── AI service ─────────────────────────────────────────────────────────────────
WORKDIR /app/ai-service
COPY ai-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Pre-cache sentence-transformers model so cold starts are instant (~90 MB)
ENV HF_HOME=/app/.cache/huggingface
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

COPY ai-service/ .

# ── NestJS server ──────────────────────────────────────────────────────────────
WORKDIR /app/server
COPY server/package*.json server/prisma.config.ts ./
COPY server/prisma ./prisma

# Production deps + prisma CLI (devDep excluded by --omit=dev; needed for migrate deploy)
RUN npm ci --omit=dev && npm install --no-save prisma@7

# Compiled output and generated Prisma client from build stage
COPY --from=server-build /build/server/dist ./dist
COPY --from=server-build /build/server/src/generated ./src/generated

# Storage directory (local adapter; mount a Render disk here for persistence)
RUN mkdir -p /app/server/storage

# ── Process supervisor ─────────────────────────────────────────────────────────
RUN pip install --no-cache-dir supervisor

COPY supervisord.conf /etc/supervisord.conf
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 9900
CMD ["/start.sh"]
