# ── Stage 1: Build NestJS ─────────────────────────────────────────────────────
# Node 22+ required: @supabase/supabase-js's RealtimeClient needs native WebSocket support at construction time (even though this app never uses Realtime), and throws on Node 20/21.
FROM node:22-slim AS server-build

WORKDIR /build/server
COPY server/package*.json server/prisma.config.ts ./
RUN npm ci
COPY server/ .
RUN npx prisma generate && npm run build

# ── Stage 2: Runtime (Node 22 + Python 3.11 in one container) ─────────────────
FROM python:3.11-slim

# Install Node.js 22 + libgomp1 (LightGBM's compiled extension needs it at runtime; python:3.11-slim doesn't ship it, so ranking silently degrades to the weighted-sum fallback without this). Node 22+ required: see the build stage's FROM comment above.
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates libgomp1 && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
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

# CA certificates for TLS to the database (server/certs/README.md). The directory holds only
# a README until the Supabase CA is committed, and the copy works either way. After the
# dependency install, so a certificate change doesn't invalidate that layer.
COPY server/certs ./certs

# Storage directory (local adapter; mount a Render disk here for persistence)
RUN mkdir -p /app/server/storage

# ── Process supervisor ─────────────────────────────────────────────────────────
RUN pip install --no-cache-dir supervisor

COPY supervisord.conf /etc/supervisord.conf
COPY start.sh /start.sh
# Strip CRLF regardless of the checked-out file's line endings (e.g. git core.autocrlf=true on a Windows dev machine) — a CRLF shebang line breaks exec("/start.sh") in this Linux container with a misleading "no such file or directory".
RUN sed -i 's/\r$//' /start.sh && chmod +x /start.sh

EXPOSE 9900
CMD ["/start.sh"]
