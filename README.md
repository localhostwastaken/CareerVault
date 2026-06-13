# CareerVault

A **Web 2.5 career-document verification platform** — organizations issue cryptographically signed, dual-approved career documents (experience letters, salary proofs, recommendations); employees hold them in a lifelong wallet; anyone can verify authenticity in seconds via a six-step cryptographic check, with daily Merkle roots anchored on a public ledger for tamper-evidence.

> Final-year project · KJ Somaiya School of Engineering. Full SRS, system design, and data model live in [`documentation/`](documentation/).

## Monorepo layout
| Path | Stack | Purpose |
|---|---|---|
| [`client/`](client/) | React 19 · Vite · Tailwind 4 · shadcn/ui · RTK Query | Web app — 5 role portals + public verifier |
| [`server/`](server/) | NestJS 11 · Prisma 7 · PostgreSQL + pgvector | API, document lifecycle, crypto, jobs |
| [`ai-service/`](ai-service/) | Python · FastAPI | Skill extraction, embeddings, explainable (SHAP) talent ranking |
| [`contracts/`](contracts/) | Hardhat · Solidity | `AnchorRegistry` — Merkle-root anchoring on Polygon |

Per-package engineering rules live in each `Claude.md`. Heavy external integrations
(KMS, blockchain, payments, email, storage) sit behind swappable adapters — local/mock
by default, so the whole stack runs with no cloud accounts.

## Prerequisites
- Node.js 20+
- Local **PostgreSQL** (14/16/17) with the **pgvector** extension
  (e.g. `brew install pgvector`, or build from source for an EnterpriseDB install)
- Python 3.11+ (only for `ai-service`)
- Redis (optional; dev falls back to in-memory)

## Setup

### 1. Database
```bash
createdb careervault
psql -d careervault -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 2. Server — http://localhost:9900/api/v1 (Swagger at `/api/docs`)
```bash
cd server
cp .env.example .env            # set DATABASE_URL
npm install
npx prisma migrate dev
npx prisma generate
npm run db:seed
npm run start:dev
```

### 3. Client — http://localhost:5173
```bash
cd client
npm install
npm run dev
```

### 4. AI service (optional, Phase 5) — http://localhost:9910
```bash
cd ai-service
python3 -m venv .venv && source .venv/bin/activate
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings
uvicorn app.main:app --reload --port 9910
```

### 5. Contracts (optional)
```bash
cd contracts && npm install && npm test
```

## Demo accounts
After `npm run db:seed`, sign in with password `Password123!`:

| Email | Role |
|---|---|
| `admin@acme.example.com` | Org Admin |
| `manager@acme.example.com` | Manager |
| `hr@acme.example.com` | HR |
| `recruiter@acme.example.com` | Recruiter |
| `alice@holder.example.com` | Holder |

`prof@university.edu` is an external, magic-link-only manager (no password).

## Status
Phase 0 foundations complete across all four packages; Phase 1 (identity & org) auth
backbone is live and verified. Remaining phases: document lifecycle → Merkle &
verification → sharing & payments → AI subsystem → hardening.
