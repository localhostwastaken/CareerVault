# CareerVault — Server Engineering Rules (NestJS)

These rules are binding for all work in `server/`. They exist to keep a 4-person team's code consistent and review-ready for an investor pitch. Optimize for reuse, simplicity, and faithful architecture — **no AI slop, no over-engineering.**

> Sibling rule files: [`../client/Claude.md`](../client/Claude.md) (React) and `../ai-service/Claude.md` (Python AI). Source specs live in [`../documentation/`](../documentation/). Cross-doc contradictions are resolved in the approved plan as **R1–R9** and restated under "Canonical truths" below — never re-litigate them; if a doc disagrees, this file + the plan win.

## Stack (do not change without updating this file)
- NestJS 11 · Node 20 LTS · TypeScript 5 (strict)
- Prisma 7 (`prisma-client` generator → `generated/prisma`; config in `prisma.config.ts`; `DATABASE_URL` env)
- PostgreSQL 16 + **pgvector** · Redis (via adapter; in-memory mock in dev)
- Auth: `@nestjs/jwt` (RS256), bcrypt, magic links
- Jobs: `@nestjs/schedule` (V1) / BullMQ (when Redis is real) · Logging: `nestjs-pino`
- Validation: `class-validator` + `class-transformer` · Crypto: Node `crypto`, `merkletreejs`, `canonicalize` (JCS)
- PDF: Puppeteer + pdf-lib · Blockchain: ethers v6 · Payments: stripe
- **ESM project** (`"type": "module"`, `module: nodenext`): relative imports MUST carry an explicit `.js` extension (e.g. `./app.module.js`); the Prisma client is generated as ESM. No `require()`.
- Runs on **:9900** (matches the client config). CORS allows the client origin with credentials.

## Adapter rule (CRITICAL)
Every external integration goes behind an interface in `src/services/<name>/` with a **mock/local** impl and a **real** impl, selected by `ConfigService`. Never call AWS/Stripe/Polygon/SES SDKs directly from a feature module.
- `KeyManagementService` — LocalKms (Node crypto, RSA-2048) ↔ AwsKms
- `BlockchainService` — LocalAnchor ↔ PolygonAmoy (ethers v6)
- `PaymentService` — MockStripe ↔ StripeTest
- `EmailService` — ConsoleEmail ↔ SES
- `StorageService` — LocalDisk ↔ S3
- `AiClient` — HTTP client to `ai-service`

## Folder layout (module-first; mirror NestJS conventions)
```
src/
  main.ts            # global prefix api/v1, ValidationPipe, CORS, filters, interceptors, pino
  app.module.ts
  config/            # env schema (Joi), ConfigModule, constants, canonical enums re-export
  common/
    guards/ interceptors/ filters/ pipes/ decorators/ dtos/ utils/ events/
  prisma/            # PrismaModule + PrismaService
  services/<name>/   # interface.ts, mock-*.service.ts, real-*.service.ts, module
  modules/<feature>/ # <feature>.module.ts, .controller.ts, .service.ts, dto/, (sub-services)
  jobs/ cron/        # scheduled work (gated by WORKER flag)
  health/
prisma/schema.prisma · prisma/seed.ts · prisma/migrations/
```

## Canonical truths (single source — never fork these)
- **DocumentStatus:** `REQUESTED → DRAFT → PENDING_HR → ISSUED → ANCHORED`; terminal `REVOKED`, `EXPIRED`. Reject = action returning to `DRAFT` (no REJECTED state). `merkleStatus` is derived, not stored.
- **Roles:** `ORG_ADMIN, MANAGER, HR, HOLDER, RECRUITER` (authenticated) + public `VERIFIER` (no account). Defined once in `schema.prisma`.
- **Hash (R4):** `document_hash = SHA-256( JCS(content_json) ++ salt )`, salt = 32-byte hex appended as UTF-8. Use `common/utils/crypto.ts` only — never inline. Worked example lives in that file's header comment.
- **Signing (R3):** RSA-2048 / RS256, sign the **hash**, via `KeyManagementService`. Verify with org public key.
- **Contract (R2):** `AnchorRegistry` (`anchorRoot`, `revokeDocument`, `verifyRoot`, `isRevoked`).
- **Billing (R5):** org tier = promotional feature gates (not Stripe). User `subscriptions.tier` = Stripe-billed.
- **Revocation (R7):** DB status authoritative; on-chain is secondary.
- **Region (R8):** ap-south-1. **Manager auth (R9):** external = magic link only; internal = email/password.

## API conventions
- Prefix `api/v1`. Success: `{ success:true, data, meta? }`. Error: `{ success:false, error:{ code, message, statusCode } }` via the global `HttpExceptionFilter`.
- DTOs validate every input (`whitelist:true, forbidNonWhitelisted:true, transform:true`). `:id` params use `ParseUuidPipe`.
- Pagination via shared `PaginationDto`. Propagate `X-Request-ID`. Document endpoints with `@nestjs/swagger` (feeds the client's generated types).

## Security (non-negotiable)
- JWT access 15m + refresh 7d (HTTP-only secure cookie, **rotated** on use). RS256 keys from config.
- **Org-scoping at the service layer:** every service method takes/derives `orgId`; every Prisma query filters by it. `OrgScopingInterceptor` populates request context; never trust a client-supplied orgId. Cross-org access must 404/403.
- `@Roles(...)` + `RolesGuard` on every protected route. Magic links: single-use, 15-min, store only the SHA-256 hash; consume on use, and **always verify against the expected `purpose`** (`verifyAndConsume(token, purpose)`) — never accept a cross-purpose link. Rate-limit auth endpoints (per-email + per-IP). Never log secrets/PII.
- Files holding key material (dev `./keys`, `storage/kms`) are written owner-only (`0600`, dir `0700`).

## Reuse catalog (search before writing new)
`PrismaService`, `ConfigService`, Pino `Logger`, `crypto.ts`, `merkle.ts`, `pagination.ts`, response/error envelope, `AuditService` + `@Audit`, `EventEmitter2` bus, the six adapters. Three similar handlers beat one over-abstracted base.

## Coding discipline
- Files: services ≤ ~200 lines, controllers thin (no business logic). Split when larger. One responsibility per file; filename matches the primary export.
- No `any` (use `unknown` + narrow). No raw SQL (Prisma only; pgvector via typed raw query helper in one util). No commented-out code. No barrel re-exports except an explicit `index.ts` where it earns its place.
- Comments explain **why** (non-obvious constraint), never narrate **what**.
- **Business logic documentation:** any non-trivial rule (lifecycle transitions, hash/signing, merkle, gating, discount, GDPR) gets a header comment block citing the rule (e.g. "R4 hash spec"); on a **major shift**, update `documentation/` and note it in the PR.

## Cron/jobs
`@nestjs/schedule` jobs (midnight Merkle batch, daily expiry, daily audit purge `STANDARD>90d`, magic-link cleanup) live in `cron/`, gated by `WORKER=true`. Idempotent; logged with context.

## Testing
Jest unit per service (mock Prisma + adapters), Supertest e2e per module. Required tests: org-scoping 403, auth 429, hash/sign/verify roundtrip, merkle proof verifies to anchored root, lifecycle transitions. `prisma/seed.ts` provides demo fixtures (one user per role + docs in every status + AI data).

## Don't
Put logic in controllers · bypass services to hit Prisma from elsewhere · call cloud SDKs outside adapters · invent a new document status or role · hardcode secrets · skip org-scoping "just this once".
