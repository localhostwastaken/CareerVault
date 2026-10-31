# CareerVault — Server Engineering Rules (NestJS)

These rules are binding for all work in `server/`. They exist to keep a 4-person team's code consistent and review-ready for an investor pitch. Optimize for reuse, simplicity, and faithful architecture — **no AI slop, no over-engineering.**

> Sibling rule files: [`../client/Claude.md`](../client/Claude.md) (React) and `../ai-service/Claude.md` (Python AI). Source specs live in [`../documentation/`](../documentation/). Cross-doc contradictions are resolved in the approved plan as **R1–R9**, plus **R10** (field encryption, added by the LY final-hardening plan), and restated under "Canonical truths" below — never re-litigate them; if a doc disagrees, this file + the plan win.

## Stack (do not change without updating this file)
- NestJS 11 · Node 20 LTS · TypeScript 5 (strict)
- Prisma 7 (`prisma-client` generator → `generated/prisma`; config in `prisma.config.ts`; `DATABASE_URL` env)
- PostgreSQL 16 + **pgvector** · Redis (via adapter; in-memory mock in dev)
- Auth: `@nestjs/jwt` (RS256), bcrypt, magic links
- Jobs: `@nestjs/schedule` (V1) / BullMQ (when Redis is real) · Logging: `nestjs-pino`
- Validation: `class-validator` + `class-transformer` · Crypto: Node `crypto`, `merkletreejs` (no JSON canonicalization library: bytes come from `common/crypto/document-bytes.ts`)
- PDF: Puppeteer + pdf-lib · Blockchain: ethers v6 · Payments: stripe
- **ESM project** (`"type": "module"`, `module: nodenext`): relative imports MUST carry an explicit `.js` extension (e.g. `./app.module.js`); the Prisma client is generated as ESM. No `require()`.
- Runs on **:9900** (matches the client config). CORS allows the client origin with credentials.

## Adapter rule (CRITICAL)
Every external integration goes behind an interface in `src/services/<name>/` with a **mock/local** impl and a **real** impl, selected by `ConfigService`. Never call AWS/Stripe/Polygon/SES SDKs directly from a feature module.
- `KeyManagementService` — **LocalKms (implemented)**: Node crypto; RSA-2048 org signing keys, plus R10 data keys via `generateDataKey`/`decryptDataKey`, which mirror AWS KMS `GenerateDataKey`/`Decrypt`. AwsKms is **roadmap**: the factory throws for any driver but `local`.
- `BlockchainService` — LocalAnchor (JSON-ledger simulator, dev default) ↔ **PolygonAnchor (implemented)**: `polygon-anchor.service.ts`, ethers v6, `BLOCKCHAIN_DRIVER=amoy`.
- `PaymentService` — MockStripe ↔ StripeTest (**roadmap**; only `mock` exists)
- `EmailService` — ConsoleEmail / Gmail SMTP ↔ SES (**roadmap**)
- `StorageService` — LocalDisk, always wrapped by `EncryptedStorageService` (R10) ↔ S3 (**roadmap**)
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
- **Hash (R4, revised 2026-10-31):** `document_hash = SHA-256(B)`, lowercase hex, where `B = documentBytes(identity, subject, salt)`.
  - `common/crypto/document-bytes.ts` only: a fixed TLV layout we own (tag ‖ u32be length ‖ value; 0x01 string, 0x02 int64, 0x03 bool, 0x04 array, 0x05 object with keys in bytewise UTF-8 order; floats and null rejected). `B = "CVDOC" ‖ 0x02 ‖ id ‖ type ‖ orgId ‖ holderId ‖ subject ‖ salt(32 raw bytes)`. RFC 8785 JCS and the `canonicalize` package are gone: verification is server-only, so no third party needs to rebuild text.
  - `content_json` is the validated subject after `normalizeSubject`; the salt is `randomBytes(32)`, stored as 64 lowercase hex chars.
  - Use `common/utils/crypto.util.ts` only — never inline. The pinned vector is in `document-bytes.spec.ts`.
- **Employee keys (revised 2026-10-31):** every MANAGER/HR enrols per org (`modules/employee-key/`). `K = PBKDF2-SHA256(len-prefixed DOB ‖ personalId ‖ 3 answers, 16-byte random salt, 600,000, 32)`; answers are normalized and never stored. `K` is stored only as `ekw1:<iv>:<ct>:<tag>`: AES-256-GCM under `HKDF-SHA256(KMS_MASTER_KEY, salt=orgId, info="careervault/employee-kek/v1")`, AAD `careervault|employee-key|<orgId>|<userId>|v<version>`. Re-enrolling over an ACTIVE key needs its current details; an org admin may reset another member's key (never their own). Keys are RETIRED, never deleted: documents pin `managerKeyId`/`hrKeyId`.
  - **Step-up:** sign and approve re-derive `K` from re-entered details and `timingSafeEqual` it with the unwrapped key. Attempts are reserved as FAILED before work and settled PASSED/REFUSED/ERRORED; 5 failures per user per 15 min lock signing (`step-up-lockout.ts`).
- **Signing (R3, revised 2026-10-31):** per signer, `seal = HMAC-SHA256(K, B)`, then RSA-2048 / RS256 via `KeyManagementService` over `signingStatementHash({documentHash, seal, role, memberId, employeeKeyId}) = SHA-256(statementBytes(...))` (C1: never the bare hash).
  - The manager seals/signs `MANAGER` at sign; HR re-checks `SHA-256(B) == documentHash`, then seals/signs `HR` at approve. Shared helper: `modules/document/document-seal.ts`.
  - The RSA key is the org's one custodial key; the HMAC seals are per person, so the two halves are two people's acts.
  - Verify against the document's pinned `signing_public_key_pem` (falling back to the org key) and the pinned employee key, which must belong to the signing member's user in the document's org.
- **Verification (R6, revised 2026-10-31):** server-only. `GET /verify/document/:id` (UUID) and `GET /verify/:token` (48 hex); the hash route, the JSON-LD credential download and `tools/verify-credential` are gone. A never-issued document answers `NOT_FOUND`. The response (`verification-view.ts`) carries verdict, issuer, signers and plain-language checks only — never a hash, salt, seal, signature, key, root or algorithm name. The chain is a badge (`anchor-badge.ts`) and never decides the verdict.
- **Merkle:** `common/utils/merkle.util.ts` only. `merkletreejs` with `sortPairs: true`; leaves are the raw 32-byte document hashes (not re-hashed); an odd node is promoted, not duplicated.
- **Contract (R2):** `AnchorRegistry` (`anchorRoot`, `revokeDocument`, `verifyRoot`, `isRevoked`).
  - On Polygon Amoy (chain 80002) at `0x483f9FF4B7444c60e93808Ea0e9b72a14b8Cb12a` (record: `contracts/deployments/amoy.json`, deploy block 48502677).
  - Reached through `PolygonAnchorService`. Only authorized anchors can write.
  - The server's ABI copy lives in `services/blockchain/anchor-registry.abi.ts`.
- **Field encryption (R10):** the Prisma query extension (`prisma/encryption/field-encryption.extension.ts`) seals `ENCRYPTED_FIELDS` (`prisma/encryption/encrypted-fields.ts`) through `FieldCipher` (`services/key-management/field-cipher.ts`).
  - **Fields:** `Document.{contentJson, salt, managerSignature, hrSignature, managerSeal, hrSeal, revocationReasonText}` and `DocumentVersion.{contentJson, changeSummary}`.
  - **Envelope:** `cvenc:v1:<keyId 16 hex>:<wrappedDek>:<iv>:<ciphertext‖tag>`, base64url and unpadded. Json columns store it as a JSON string.
  - **Cipher:** AES-256-GCM, a fresh 12-byte IV per field, **AAD `careervault|<field>|v1`** (the bare field name), and one data key (DEK) per row payload. An `updateMany` seals its payload once, so every matched row gets the same envelope.
  - **Key hierarchy:** `KMS_MASTER_KEY` (32 bytes) → HKDF-SHA256 (`info = careervault/field-kek/v1`) → field KEK. The `keyId` is the first 16 hex of SHA-256(KEK). The KEK wraps each DEK with AES-256-GCM (AAD `careervault|dek|v1`). The org RSA key files are wrapped directly under the master key.
  - **PDFs:** issued PDFs are sealed by `EncryptedStorageService` with label `file:<key>`.
  - **Plaintext by design:** `documentHash`, `signingPublicKeyPem`, user email and name (a blind index is roadmap), and embeddings.
  - **Known gap:** revocation and rejection reason text is also copied into `audit_logs.new_value` and notifications, in plaintext.
  - **Strict reads:** `FIELD_ENCRYPTION_STRICT` (Joi boolean, default `false`; `true` in `render.yaml`) reaches the extension as `fieldEncryption(cipher, { strict })`. On, a non-null, non-envelope value in an encrypted column makes the read throw `PlaintextFieldError`, which names the field and never the value. Off, it is returned unchanged (legacy passthrough), which dev databases with pre-R10 rows need.
  - **Batch integrity gate:** `modules/merkle/integrity-gate.ts` re-reads each Merkle candidate's encrypted fields through `PrismaService` and requires `hashDocument(content, salt) === documentHash`. A failure is skipped, logged without values and left `ISSUED`; erased documents (salt null) are never candidates. Our wallet signs every anchor, so never select candidates around the gate. It stops rows planted around the app, not documents issued through it by a DB writer who granted themselves memberships (viva guide L15).
  - **Known gap (dev only):** with strict off, legacy passthrough plus the trusted plaintext `signing_public_key_pem` let a DB writer plant a self-consistent forged row that the batch then anchors; `db:audit-encryption` flags it.
  - **Known gap:** envelopes are bound to the field, not the row, so an envelope copied into another row decrypts there. A row-bound AAD is roadmap.
  - **Plain Json columns:** every non-encrypted Json column is listed in `PLAIN_JSON_FIELDS` (`encrypted-fields.spec.ts` fails otherwise), and the read walk never enters one, so a key inside it (an AI skill named `salt`) is never taken for a field.
  - **Unreadable records:** public verification (`/verify/hash`, a share link, each bulk item) reports a record whose fields can't be read as R10 data as `INVALID` with no content (`isFieldReadError`: a failed envelope, a wrapped data key that fails to unwrap under our own key id, or plaintext strict mode refuses).
    - An envelope naming another key id (`DataKeyUnavailableError.keyMismatch`) is what a wrong `KMS_MASTER_KEY` looks like on every row, so it is a 503 `ENCRYPTION_KEY_UNAVAILABLE` that names no key, never `INVALID`. A DB writer can use that to deny one record's lookup (viva guide L16).
    - A bulk request gives each hash whose lookup throws, for any reason, its own error entry, so one hash never fails the call.
  - **Never** filter, sort or `distinct` on an encrypted field (the extension throws), and never write one through a nested relation write.
  - `npm run db:audit-encryption` proves the DB and storage hold no plaintext.
- **Billing (R5):** org tier = promotional feature gates (not Stripe). User `subscriptions.tier` = Stripe-billed.
- **Revocation (R7):** DB status authoritative; on-chain is secondary.
- **Input hardening:** `common/middleware/payload-guard.middleware.ts` runs on every route before any DTO and refuses `__proto__`/`constructor`/`prototype` keys, markup, control characters and deep nesting. Identifier fields use allow-list formats (`common/validators/formats.ts`). SQL keywords are NOT filtered: all SQL is parameterized (ESLint bans `$queryRawUnsafe`/`$executeRawUnsafe`). Prisma error codes map to generic 4xx; no DB message reaches a client. `test/adversarial.e2e-spec.ts` is the proof.
- **Region (R8):** ap-south-1. **Manager auth (R9):** external = magic link only; internal = email/password.

## API conventions
- Prefix `api/v1`. Success: `{ success:true, data, meta? }`. Error: `{ success:false, error:{ code, message, statusCode } }` via the global `HttpExceptionFilter`.
- DTOs validate every input (`whitelist:true, forbidNonWhitelisted:true, transform:true`). `:id` params use `ParseUuidPipe`.
- Pagination via shared `PaginationDto`. Propagate `X-Request-ID`. Document endpoints with `@nestjs/swagger` (feeds the client's generated types).

## Security (non-negotiable)
- JWT access 1d + refresh 7d (HTTP-only secure cookie, **rotated** on use). RS256 keys from config. (Widened from the original 15m — the client's `APISlice` baseQuery now transparently refreshes on 401 and redirects to login on refresh failure, so the shorter TTL was no longer buying revocation safety the frontend could act on; 1d trades some of that blast-radius reduction for far fewer refresh round-trips.)
- **Org-scoping at the service layer:** every service method takes/derives `orgId`; every Prisma query filters by it. `OrgScopingInterceptor` populates request context; never trust a client-supplied orgId. Cross-org access must 404/403.
- `@Roles(...)` + `RolesGuard` on every protected route. Magic links: single-use, 15-min, store only the SHA-256 hash; consume on use, and **always verify against the expected `purpose`** (`verifyAndConsume(token, purpose)`) — never accept a cross-purpose link. Rate-limit auth endpoints (per-email + per-IP). Never log secrets/PII.
- Files holding key material (dev `./keys`, `storage/kms`) are written owner-only (`0600`, dir `0700`).
- **Org signing keys must live on durable storage.** With `KEY_MANAGEMENT_DRIVER=local` the private keys are files under `STORAGE_LOCAL_DIR` while only a POINTER (`organizations.kms_key_id`) is in Postgres. On an ephemeral container the files vanish on every deploy and the pointer does not, which took every signature down with a bare 500. Two things prevent it now and both must stay: a mounted disk in `render.yaml`, and `KMS_MASTER_KEY` being **required in production** (unset, the dev fallback keeps a generated master key in `STORAGE_LOCAL_DIR/kms/master.key`, which an ephemeral container loses on every deploy). `ensureOrgKey` verifies the material exists and re-keys if it does not — safe only because `documents.signing_public_key_pem` records the key each signature was made under, so re-keying never invalidates history. Do not remove that column's use in `VerificationService`.

## Reuse catalog (search before writing new)
`PrismaService`, `ConfigService`, Pino `Logger`, `crypto.util.ts`, `merkle.util.ts`, `FieldCipher`, `common/dtos/pagination.dto.ts` (`PaginationDto`, `pageMeta`), response/error envelope, `AuditService` (the org-scoped audit-log *reader*; services write `auditLog` rows directly), the adapters in `services/`. Three similar handlers beat one over-abstracted base.

## Coding discipline
- Files: services ≤ ~200 lines, controllers thin (no business logic). Split when larger. One responsibility per file; filename matches the primary export.
- No `any` (use `unknown` + narrow). No raw SQL (Prisma only; pgvector via typed raw query helper in one util). No commented-out code. No barrel re-exports except an explicit `index.ts` where it earns its place.
- Comments explain **why** (non-obvious constraint), never narrate **what**.
- **Business logic documentation:** any non-trivial rule (lifecycle transitions, hash/signing, merkle, gating, discount, GDPR) gets a header comment block citing the rule (e.g. "R4 hash spec"); on a **major shift**, update `documentation/` and note it in the PR.

## Cron/jobs
`@nestjs/schedule` jobs (midnight Merkle batch, daily expiry, daily audit purge `STANDARD>90d`, magic-link cleanup) live in `cron/`, gated by `WORKER=true`. Idempotent; logged with context.

## Testing
Jest unit per service (mock Prisma + adapters), Supertest e2e per module (`npm run test:e2e`). Required tests: org-scoping 403, auth 429, hash/sign/verify roundtrip, merkle proof verifies to anchored root, lifecycle transitions, **signing-key loss recovery** (`test/signing-key.e2e-spec.ts`). `prisma/seed.ts` provides demo fixtures (one user per role + docs in every status + AI data).

Browser coverage of the full org → request → sign → approve → issue → verify chain lives in [`../e2e/`](../e2e/README.md) (Playwright, boots its own API + client against `careervault_e2e`). Anything that changes the document lifecycle, the role gates or the auth/session flow must be run against it. `NODE_ENV=test` disables rate limiting via `TestEnvThrottlerGuard` — that is the ONLY behaviour keyed off `test`, and it must stay that way.

## Don't
Put logic in controllers · bypass services to hit Prisma from elsewhere · call cloud SDKs outside adapters · invent a new document status or role · hardcode secrets · skip org-scoping "just this once".

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
