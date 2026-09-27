# ── Stage 1: Build NestJS ─────────────────────────────────────────────────────
# Node 22+ required: @supabase/supabase-js's RealtimeClient needs native WebSocket support at construction time (even though this app never uses Realtime), and throws on Node 20/21.
FROM node:22-slim AS server-build

WORKDIR /build/server
COPY server/package*.json server/prisma.config.ts ./
RUN npm ci
COPY server/ .
RUN npx prisma generate && npm run build

# ── Stage 2: Runtime (Node 22 only) ───────────────────────────────────────────
# The AI workload (skill extraction, embeddings, ranking) now runs as its own Render service — see ai-service/Dockerfile — reached over HTTP via AI_SERVICE_URL (render.yaml). This image no longer bundles Python/Uvicorn/sentence-transformers.
FROM node:22-slim

# openssl: Prisma's query engine dynamically links libssl at runtime and isn't present on the slim base by default (the classic "libssl.so.1.1 not found" failure — previously masked because the old Python base image pulled it in transitively). ca-certificates: TLS to Supabase/Groq/Gmail/Polygon RPC/the standalone ai-service.
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

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

COPY start.sh /start.sh
# Strip CRLF regardless of the checked-out file's line endings (e.g. git core.autocrlf=true on a Windows dev machine) — a CRLF shebang line breaks exec("/start.sh") in this Linux container with a misleading "no such file or directory".
RUN sed -i 's/\r$//' /start.sh && chmod +x /start.sh

EXPOSE 9900
CMD ["/start.sh"]
