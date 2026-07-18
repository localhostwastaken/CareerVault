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

Per-package engineering rules live in each `Claude.md`. Heavy external integrations (KMS, blockchain, payments, email, storage) sit behind swappable adapters — local/mock by default, so the whole stack runs with no cloud accounts.

## Prerequisites
- Node.js 20+
- Local **PostgreSQL** (14/16/17) with the **pgvector** extension
  (e.g. `brew install pgvector`, or build from source for an EnterpriseDB install)
- Python 3.11+ (only for `ai-service`)
- Redis (optional; dev falls back to in-memory)

## Setup

### 1. Database
```bash
psql -h localhost -U postgres -d careervault -c "CREATE EXTENSION IF NOT EXISTS vector;"
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

## Verification & offline proof
A document's authenticity is proven from its **W3C Verifiable Credential**, a standalone JSON-LD payload fetched from `GET /api/v1/documents/:id/credential`. That file embeds everything a third party needs to verify **offline, without CareerVault online**: the
canonical `credentialSubject`, the `proof.salt` and `proof. documentHash` (R4: `SHA-256( JCS(content) ++ salt )`), the RS256 manager/HR signatures, the issuer's public key, and the Merkle proof once anchored.

> The issued **PDF is a human-readable artifact only** — it shows the document hash in its footer but intentionally does **not** carry the JSON-LD or the salt in its metadata. The salt is kept out of the PDF so it stays portable through the credential file; never rely on PDF metadata for verification. (PDF metadata is used solely to stamp the Merkle anchor for archival once a root is on-chain.)

## Demo accounts
After `npm run db:seed`, sign in with password `Password123!`:

| Email | Role | Organization |
|---|---|---|
| `admin@techcorp.example.com` | Org Admin | TechCorp |
| `marcus@techcorp.example.com` | Manager | TechCorp |
| `hr@techcorp.example.com` | HR | TechCorp |
| `gabriel@globalsolutions.example.com` | Manager | GlobalSolutions |
| `alice@holder.example.com` | Holder | — |
| `bob@holder.example.com` | Holder | — |

TechCorp and GlobalSolutions are seeded pre-verified. Holders have no org membership (every authenticated user is implicitly a holder).

## Status
Feature-complete across all four packages: auth, org/membership, the full document lifecycle (request → sign → HR approval → issuance → Merkle anchoring → revoke/expire), bulk issuance, public verification, verifier API keys (Bulk API), sharing & payments, subscriptions, notifications & audit logging, recruiter talent matching (AI service, tested and hardened), skills extraction, and analytics. See [`documentation/FeatureAudit.md`](documentation/FeatureAudit.md) for the full route-by-route breakdown.

Partial/upcoming: usage-based Stripe metering for the Bulk Verification API, and a verifier usage/analytics dashboard.
