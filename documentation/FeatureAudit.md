# CareerVault — Feature Audit

> Status as of August 2026. Covers all implemented and working features across backend, frontend, and AI service.
>
> **Updated September 2026 (LY final hardening):**
> - field-level envelope encryption (R10) and encrypted PDFs;
> - the Polygon Amoy anchoring driver (the contract deploy is still pending);
> - the standalone offline credential verifier;
> - strict R10 reads (`FIELD_ENCRYPTION_STRICT`, on in production), a batch-time integrity gate before anchoring, and complete GDPR erasure of the holder's documents and PDFs.
>
> The byte-exact spec, with code references, is in [`Crypto_Pipeline_Viva_Guide.md`](Crypto_Pipeline_Viva_Guide.md).

---

## Authentication & User Management ✅

**Backend routes:**
- `POST /api/v1/auth/register` — email/password registration
- `POST /api/v1/auth/login` — email/password login
- `POST /api/v1/auth/refresh` — refresh JWT (HTTP-only cookie)
- `POST /api/v1/auth/logout` — revoke refresh token
- `GET /api/v1/auth/me` — fetch authenticated user profile
- `POST /api/v1/auth/magic-link` — request passwordless magic link
- `POST /api/v1/auth/verify-magic-link` — consume magic link token
- `POST /api/v1/auth/set-password` — set initial password
- `POST /api/v1/auth/change-password` — change existing password

**User profile (User module):**
- `GET /api/v1/users/me` — full user profile
- `PATCH /api/v1/users/me` — update profile (name, phone, avatar)
- `DELETE /api/v1/users/me` — GDPR account deletion (anonymize PII, drop discovery/AI data, revoke sessions, scrub every document, delete PDFs)

**Frontend pages:** `/auth/login`, `/auth/register`, `/auth/magic`, `/app/profile`

**Features:**
- JWT RS256 — 15-min access token + 7-day refresh token
- Refresh token rotation with IP/user-agent tracking
- GDPR account deletion. What it does:
  - anonymizes PII and revokes sessions, API keys and share links;
  - drops discovery data;
  - on **every** one of the holder's documents (issued, anchored, revoked and expired ones included), nulls the salt, scrubs the content to `{}` and nulls the PDF link, so nobody can recompute or prove the hash from content;
  - scrubs every version snapshot;
  - writes a `USER_ERASED` audit row (ids only, COMPLIANCE tier) in the same transaction;
  - after the commit, deletes the stored PDFs, best effort: a failed delete is logged for manual removal and never undoes the erasure.
- What stays is the issuer's record: the hash, both signatures and the Merkle proof, with the document's type, status, dates and any revocation code and reason. The public hash lookup of an erased document returns `erased: true`, no document content and no revocation reason text. Its integrity check says the holder exercised their right to erasure and the original content no longer exists. Audit rows keep document hashes, member ids and reason text as the compliance trail.

---

## Organization & Membership Management ✅

**Backend routes:**
- `POST /api/v1/orgs` — create organization
- `GET /api/v1/orgs` — list verified organizations
- `GET /api/v1/orgs/:id` — get org details
- `PUT /api/v1/orgs/:id` — update org settings (admin only)
- `POST /api/v1/orgs/:id/verify-domain` — trigger DNS TXT record verification
- `GET /api/v1/orgs/:id/managers` — list active managers (public)
- `GET /api/v1/orgs/:id/members` — list org members
- `POST /api/v1/orgs/:id/members` — invite member by email
- `DELETE /api/v1/orgs/:id/members/:memberId` — deactivate member

**Frontend pages:** `/app/org`, `/app/members`

**Features:**
- DNS domain verification via TXT record lookup
- Org tiers: FREE, STARTER, ENTERPRISE
- Roles: `ORG_ADMIN`, `MANAGER`, `HR`, `RECRUITER`

---

## Document Lifecycle ✅

Full pipeline implemented end-to-end across all roles.

```
REQUESTED → DRAFT → PENDING_HR → ISSUED → ANCHORED
                ↑                    ↓
             (reject/return)     REVOKED / EXPIRED
```

**Backend routes:**
- `POST /api/v1/documents/request` — holder requests document
- `GET /api/v1/documents` — list documents (role-scoped)
- `GET /api/v1/documents/:id` — document detail
- `PUT /api/v1/documents/:id` — update draft content
- `POST /api/v1/documents/:id/sign` — manager signs (REQUESTED/DRAFT → PENDING_HR)
- `POST /api/v1/documents/:id/approve` — HR approves (PENDING_HR → ISSUED)
- `POST /api/v1/documents/:id/reject` — HR rejects (PENDING_HR → DRAFT)
- `POST /api/v1/documents/:id/return` — manager returns to holder
- `PUT /api/v1/documents/:id/resubmit` — holder resubmits after rejection
- `POST /api/v1/documents/:id/revoke` — revoke issued document
- `DELETE /api/v1/documents/:id` — delete (REQUESTED/DRAFT only)
- `GET /api/v1/documents/:id/download` — download rendered PDF
- `GET /api/v1/documents/:id/credential` — download W3C Verifiable Credential (JSON-LD)

**Frontend pages (all 6 role portals):**

| Role | Pages |
|------|-------|
| Holder | `/app/wallet`, `/app/documents`, `/app/request`, `/app/documents/:id` |
| Manager | `/app/inbox`, `/app/documents/:id/sign`, `/app/signed` |
| HR | `/app/approvals`, `/app/issued` |
| Org Admin | `/app/org`, `/app/members`, `/app/analytics` |
| Recruiter | `/app/talent`, `/app/matches` |
| Verifier | `/verify`, `/verify/hash/:hash`, `/verify/:token` |

Plus a public marketing landing at `/`.

**Expiry:** Experience letters & salary proofs expire 90 days after issuance (`expiresAt = issued_at + 90d`); LORs never expire (`expiresAt = null`). A daily retention cron (3 AM, gated by `WORKER=true`) flips past-validity `ISSUED`/`ANCHORED` docs to `EXPIRED`; verification also treats them as expired dynamically.

---

## Cryptographic Signing ✅

Per R3 & R4 spec:

- **Hash:** `SHA-256(JCS(contentJson) ++ salt)`. JCS is the JSON Canonicalization Scheme (RFC 8785). The salt is 32 random bytes, stored as 64 hex chars.
- **Signatures:** RSA-2048 / RS256. The manager signs first, then HR (dual approval). Each signs a distinct role statement, `SHA-256(JCS({v:1, documentHash, role, memberId}))`, not the bare hash. Both use the org's **single custodial key**: separation of duties is enforced by RBAC and recorded in the statements, not proven by two personal keys (per-member keys are roadmap).
- **Key Management:** LocalKMS (Node crypto) in every environment.
  - Per-org RSA-2048 private keys are stored as files, AES-256-GCM-wrapped under `KMS_MASTER_KEY`, which is required in production.
  - It also provides R10 data keys via `generateDataKey`/`decryptDataKey`, which mirror AWS KMS.
  - **Roadmap:** the AWS KMS driver. `KEY_MANAGEMENT_DRIVER=aws` throws "not implemented".
- **Key files:** JWT RS256 keys auto-generated under `server/keys/` if not set in `.env`; per-org signing keys under `storage/kms/` (owner-only, wrapped under the master key)
- **Document versions:** each draft edit creates an auditable version record

---

## Merkle Trees & Blockchain Anchoring ✅

**Backend routes:**
- `POST /api/v1/merkle/run` — manually trigger batch (admin)
- `GET /api/v1/merkle/batches` — list historical batches

**Features:**
- Daily midnight (Asia/Kolkata) cron batch, gated by `WORKER=true`, plus an admin **Anchor now** card on `/app/analytics` with recent batches and PolygonScan links.
- Merkle tree: SHA-256 over sorted pairs; leaves are the raw document hashes; an odd node is promoted, not duplicated.
- Integrity gate: before a candidate joins the tree, its encrypted fields are re-read (strict mode applies) and its content and salt must recompute its hash. A failing document is skipped, logged without values and left `ISSUED`; the rest of the batch anchors.
- LocalAnchor (a persistent JSON ledger at `./storage/chain/ledger.json`) is the dev default. Its anchors have no chain id and can't be checked independently.
- **PolygonAnchorService is implemented** (`BLOCKCHAIN_DRIVER=amoy`, ethers v6). It calls `AnchorRegistry.anchorRoot` on Polygon Amoy (chain 80002) with:
  - a 30 gwei tip floor;
  - serialized writes;
  - confirmation polling (2 confirmations);
  - idempotent retries;
  - a boot self-check;
  - verification that degrades to "pending" when the RPC is down.
- **Pending:** the contract deploy to Amoy is a human-gated step; the address will be `<AMOY_REGISTRY_ADDRESS>`.
- Merkle proofs are stored per document and included in the JSON-LD credential download, along with the chain id, contract and transaction.

---

## Field Encryption (R10) ✅

Application-level envelope encryption, so a live SQL view, a dump or a backup shows ciphertext for
the sensitive document columns.

- **Encrypted:** `documents.{content_json, salt, manager_signature, hr_signature, revocation_reason_text}` and `document_versions.{content_json, change_summary}`. Each is stored as `cvenc:v1:<keyId>:<wrappedDek>:<iv>:<ciphertext‖tag>`.
- **Scheme:** AES-256-GCM, with a fresh data key per row payload, a fresh 12-byte IV per field, and AAD `careervault|<field>|v1`. An `updateMany` seals its payload once, so every row it matches gets the same envelope.
- **Key hierarchy:** `KMS_MASTER_KEY` → HKDF-SHA256 field KEK (`careervault/field-kek/v1`) → a data key per row payload.
- **Where it runs:** a Prisma 7 query extension (`server/src/prisma/encryption/`), so every service still reads and writes plaintext.
- **PDFs:** issued PDFs are encrypted on disk by `EncryptedStorageService`.
- **Safety nets:**
  - a boot self-test refuses to start if data keys can't be opened;
  - `npm run db:audit-encryption` counts encrypted / null / plaintext / undecryptable values in the DB and storage and exits 1 on any plaintext;
  - `test/encryption.e2e-spec.ts` asserts the envelopes with raw SQL.
- **Plaintext by design:** `document_hash` (the public lookup key and Merkle leaf; salted and one-way), `signing_public_key_pem`, user email and name, and embeddings.
- **Strict reads:** `FIELD_ENCRYPTION_STRICT=true` (set in `render.yaml` for production; `false` by default for dev databases with pre-R10 rows) refuses any non-envelope value in an encrypted column instead of returning it as legacy plaintext. The Merkle batch also skips, and never anchors, a document whose fields don't decrypt or don't recompute its hash. `test/strict-encryption.e2e-spec.ts` plants a self-signed plaintext row and proves both.
- **Known gaps:**
  - reason text in audit logs and notifications is plaintext;
  - **dev only:** with strict mode off, plaintext found in an encrypted column is read back as legacy data. Verification also trusts the plaintext `signing_public_key_pem` column. Together, these let someone with DB write access plant a self-consistent forged row, which the batch then anchors; `db:audit-encryption` flags it. Production runs strict mode, which closes this;
  - envelopes are bound to the field, not the row, so a DB writer can copy a real envelope into another row and the app decrypts it for that row's holder. Binding the AAD to the row id is roadmap;
  - membership grants aren't signed or audited. A DB writer can insert `MANAGER`/`HR` rows for their own accounts and issue through the app, which signs with the real org key; strict mode and the batch gate don't stop that. Auditing or signing grants is roadmap;
  - there's no master-key rotation tooling;
  - the master key is an environment secret. **Roadmap:** AWS KMS, and a blind index for email.

---

## Public Verification ✅

No account required.

**Backend routes:**
- `GET /api/v1/verify/hash/:hash` — verify by document hash
- `GET /api/v1/verify/:token` — verify by share link token

**Verification report includes:**
- Canonical content + credential subject
- Manager & HR signature validation
- Salt + document hash (R4)
- Merkle proof → anchored root
- Org public key verification
- On-chain anchor status, with PolygonScan links for the transaction and the contract. An unreachable chain reads as `VERIFIED_PENDING_ANCHOR`, never as a failure.
- Tamper detection (salt/hash/signature mismatch)
- An erased holder's document returns `erased: true` and no content, with an integrity check that names erasure
- A record whose stored fields can't be read (a failed envelope or wrapped data key, or plaintext under strict mode) reads `INVALID` with no content, by hash or by share link. An envelope naming a different key id returns a 503 (`ENCRYPTION_KEY_UNAVAILABLE`) instead, because that is what a wrong master key looks like
- In a bulk call each hash gets its own result, or its own error entry if its lookup fails, so one hash never fails the whole call

**Frontend pages:** `/verify`, `/verify/hash/:hash`, `/verify/:token`

**Offline verifier:** `tools/verify-credential` re-checks a downloaded credential with its own code, importing nothing from `server/`. It checks:
- integrity and both RS256 statements;
- Merkle inclusion;
- the registry pin (`KNOWN_REGISTRIES` / `--registry`);
- `verifyRoot`, `isRevoked` and the `RootAnchored` receipt on-chain;
- revocation: a credential whose own revocation block is filled in, or that the pinned registry records as revoked, fails with exit 1. A revocation at an unpinned address, or a missing transaction hash, only warns.

`--selftest` replays the shared known-answer vectors. It doesn't prove that the issuer key belongs to the named organisation; it prints the key fingerprint for an out-of-band check.

---

## Sharing & Payments ✅

**Backend routes:**
- `POST /api/v1/share-links` — create shareable link (optional paywall, max-views, expiry)
- `GET /api/v1/share-links` — list holder's links
- `DELETE /api/v1/share-links/:id` — deactivate link
- `POST /api/v1/payments/webhook` — Stripe webhook (signature-verified)
- `POST /api/v1/payments/mock/complete` — mock payment completion (dev)

**Frontend pages:** `/app/share-links`, `/payments/mock`

**Features:**
- Per-link view tracking and analytics
- MockStripe in dev; Stripe planned (adapter stub — not yet wired)

---

## Subscriptions & Billing ✅

**Backend routes:**
- `GET /api/v1/subscriptions/me` — current subscription
- `GET /api/v1/subscriptions/plans` — available plans
- `POST /api/v1/subscriptions` — subscribe to tier
- `POST /api/v1/subscriptions/cancel` — cancel subscription

**Frontend pages:** `/app/billing`

**Tiers:** `HOLDER_PREMIUM`, `VERIFIER_BASIC`, `VERIFIER_ENTERPRISE`

---

## Notifications & Audit Logging ✅

**Backend routes:**
- `GET /api/v1/notifications` — list notifications (paginated)
- `GET /api/v1/notifications/unread-count` — unread count
- `PUT /api/v1/notifications/read-all` — mark all read
- `PUT /api/v1/notifications/:id/read` — mark one read

**Notification types:**
`DOCUMENT_REQUESTED`, `PENDING_HR_REVIEW`, `DOCUMENT_APPROVED`, `DOCUMENT_REJECTED`, `DOCUMENT_ISSUED`, `DOCUMENT_ANCHORED`, `DOCUMENT_REVOKED`, `LINK_VIEWED`, `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `RECRUITER_MESSAGE`, `TALENT_MATCH`

**Audit logs:**
- **Logged events:**
  - COMPLIANCE tier: document signed, issued and revoked; every public verification (verdict); bulk-issuance start and completion; an org signing key replaced; GDPR erasure (`USER_ERASED`).
  - STANDARD tier: document rejected.
- **What each row records:** actor, action, entity type and id, details in `new_value`, and a timestamp. The `old_value`, `ip_address` and `user_agent` columns exist but aren't populated yet. Logins, profile edits and anchoring aren't audited.
- **Retention:** STANDARD rows are auto-purged after 90 days by the retention cron. COMPLIANCE rows are never auto-purged; the 7-year window is policy, not enforced in code.

---

## Recruiter Module & Talent Matching ✅

**Backend routes:**
- `GET /api/v1/recruiter/me` — recruiter profile
- `POST /api/v1/recruiter/job-openings` — create job opening
- `GET /api/v1/recruiter/job-openings` — list openings
- `POST /api/v1/recruiter/job-openings/:id/close` — close opening
- `POST /api/v1/recruiter/job-openings/:id/search` — trigger AI talent search
- `GET /api/v1/recruiter/job-openings/:id/matches` — list ranked matches
- `POST /api/v1/messages` — send message to holder
- `GET /api/v1/messages/sent` / `received` — message threads
- `POST /api/v1/messages/:id/respond` — holder responds (INTERESTED / NOT_INTERESTED)

**Frontend pages:** `/app/talent`, `/app/matches`

**Features:**
- Job opening embeddings stored in pgvector (384-dim)
- Talent search calls AI service with job + candidate embeddings
- SHAP explanations per match, per feature
- Recruiter search scope: `SAME_ORG` or `ALL_ORGS`

---

## Skills & Discovery ✅

**Backend routes:**
- `GET /api/v1/skills/me` — holder's extracted skills
- `PUT /api/v1/skills/discoverability` — opt in/out of talent search
- `POST /api/v1/skills/extract/:documentId` — manually trigger extraction

**Frontend pages:** `/app/skills`

**Extracted fields:** skills, job title, seniority (JUNIOR/MID/SENIOR/LEAD), years of experience, certifications, industries, confidence scores

---

## AI Service (Python/FastAPI, port 9910) ✅

**Endpoints:**
- `GET /health` — service status
- `POST /extract` — extract skills from document text (Groq LLM or heuristic fallback)
- `POST /embed` — compute 384-dim embedding (sentence-transformers)
- `POST /rank` — rank candidates with SHAP contributions

---

## Analytics ✅

**Backend routes:**
- `GET /api/v1/analytics/overview` — org-level metrics (documents by status, members, activity)

**Frontend pages:** `/app/analytics`

---

## Platform / Ops ✅

- `GET /api/v1/health` — liveness + DB connectivity check (`SELECT 1`)
- `GET /api/v1/` — root liveness message

---

## Adapter Abstractions ✅

All external integrations are behind swappable adapters — local/mock by default, no cloud accounts needed for dev.

| Adapter | Dev (wired) | Prod target | Wired? |
|---------|-------------|-------------|--------|
| Key Management | LocalKMS (Node crypto: RSA-2048 signing keys + R10 data keys) | AWS KMS | Local ✓ wired (all environments); AWS ✗ roadmap |
| Blockchain | LocalAnchor (JSON ledger) | Polygon Amoy (ethers v6) | ✓ wired (`BLOCKCHAIN_DRIVER=amoy`); contract deploy to Amoy pending |
| Payment | MockStripe | Stripe | ✗ roadmap |
| Email | ConsoleEmail (stdout) / Gmail SMTP (nodemailer) | AWS SES | Gmail ✓ wired; SES ✗ roadmap |
| Storage | LocalDisk (`./storage`), always wrapped by `EncryptedStorageService` (R10) | AWS S3 | Local ✓ wired (encrypted at rest); S3 ✗ roadmap |
| DNS Verification | LocalDns (always passes) | Real TXT lookup | ✓ wired |

> **Wired today:** all Dev implementations, the real DNS adapter, Gmail SMTP for email, and the Polygon Amoy anchoring driver (`BLOCKCHAIN_DRIVER=amoy`, which needs `POLYGON_RPC_URL`, `ANCHOR_REGISTRY_ADDRESS` and `ANCHOR_PRIVATE_KEY`). Gmail (`EMAIL_DRIVER=gmail`, via `GMAIL_USER`/`GMAIL_APP_PASSWORD` app password) sends real mail without a domain or cloud account — good for prototypes, capped at Gmail's ~500 recipients/day. Selecting any other prod driver (`aws`, `stripe`, `ses`, `s3`) throws `<DRIVER>="..." not implemented`; those remain roadmap, pending cloud accounts.

---

## Seeded Demo Accounts

Run `npm run db:seed` in `server/`. All accounts use the password in `SEED_DEMO_PASSWORD`, or the local-dev default `Password123@` when it's unset. The deployed stack is seeded with a non-public value (`documentation/Deploy_Runbook.md`).

| Name | Role | Org |
|------|------|-----|
| Olivia | ORG_ADMIN | TechCorp (verified, STARTER) |
| Marcus | MANAGER | TechCorp |
| Hannah | HR | TechCorp |
| Gabriel | MANAGER | GlobalSolutions (verified, FREE) |
| Alice | HOLDER | — (discoverable) |
| Bob | HOLDER | — (has demo documents in various states) |

---

## Bulk Issuance ✅

HR uploads a CSV of employees and issues `EXPERIENCE_LETTER`/`SALARY_PROOF` documents in
batch, skipping `PENDING_HR` — HR acts as both signer and approver.

**Backend routes:**
- `POST /api/v1/bulk-issuance` — upload CSV (multipart), returns `202` with the batch
- `GET /api/v1/bulk-issuance` — list an org's batches
- `GET /api/v1/bulk-issuance/:id` — poll a single batch's progress

**Features:** all-or-nothing CSV validation (max 500 rows), async in-process processing,
`BULK_ISSUANCE_STARTED`/`COMPLETED` compliance-tier audit logs, two distinct role statements (MANAGER
and HR) each signed with the org key, both naming the acting HR member, 90-day expiry, and a magic
link for each new holder.

**Frontend page:** `/app/bulk` (HR nav — "Bulk Issue")

---

## Verifier API Keys ✅

Paid Bulk Verification API for enterprise/basic verifiers (R6), gated by an active
`VERIFIER_BASIC`/`VERIFIER_ENTERPRISE` subscription.

**Backend routes:**
- `POST /api/v1/verifier-keys` — mint a key (raw value shown once)
- `GET /api/v1/verifier-keys` — list the caller's keys
- `DELETE /api/v1/verifier-keys/:id` — revoke a key
- `POST /api/v1/verify/bulk` — `X-API-Key`-authenticated bulk hash verification, with
  a per-tier rate limit (BASIC 100/min, ENTERPRISE 1000/min)

**Frontend page:** `/app/verifier-api` (Holder nav — "Verifier API"; subscribe, then
manage keys)

---

## AI Service Hardening ✅

- Pytest suite covering the heuristic extraction path, Groq-failure fallback, embedding
  hashing-fallback, and the ranking weighted-sum path
- Warning-level logging on every silent fallback (Groq failure, embedding model
  unavailable, ranking model unavailable)
- Request size caps on `/extract` and `/embed` (422 over 50,000 characters)
- Timeout on the NestJS → ai-service call (`AiClientService`), just above the ai-service's
  own 30s Groq timeout
- Optional shared secret (`AI_SERVICE_SECRET` / `X-Service-Secret` header) between the two
  services, no-op when unset

---

## Partial / Upcoming

| Feature | Status |
|---------|--------|
| Bulk API metering | Verifier API keys exist; usage-based Stripe metering (per SystemDesign) not yet wired |
| Verifier API keys UI polish | Functional; no usage/analytics dashboard yet |
| Amoy contract deployment | Pending, human-gated. `AnchorRegistry` isn't deployed yet; the address and the verifier's `KNOWN_REGISTRIES[80002]` get filled in afterwards. |
| Database TLS pinning + Supabase Data API off | Pending, human-gated. Pin Supabase's CA (`sslmode=verify-full`), then enforce SSL. Nothing in the repo does this yet. |
| AWS KMS driver, KEK rotation tooling, email blind index | Roadmap |
| Per-member signing keys, multisig registry owner | Roadmap |
| Row-bound envelope AAD (so a copied envelope fails in another row) | Roadmap |
| Audited or signed membership grants (so a DB writer can't grant themselves a signing role) | Roadmap |
