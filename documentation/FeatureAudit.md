# CareerVault — Feature Audit

> Status as of July 2026. Covers all implemented and working features across backend, frontend, and AI service.

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
- `DELETE /api/v1/users/me` — GDPR account deletion (anonymize PII, drop discovery/AI data, revoke sessions)

**Frontend pages:** `/auth/login`, `/auth/register`, `/auth/magic`, `/app/profile`

**Features:**
- JWT RS256 — 15-min access token + 7-day refresh token
- Refresh token rotation with IP/user-agent tracking
- GDPR-compliant account deletion (anonymize PII, revoke sessions, drop discovery data)

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

- **Hash:** `SHA-256(JCS(contentJson) ++ salt)` — JCS = JSON Canonicalization Scheme; salt = 32-byte random hex
- **Signatures:** RSA-2048 / RS256 — Manager signs first, then HR (dual approval)
- **Key Management:** LocalKMS (Node crypto) in dev; AWS KMS planned (adapter stub — not yet wired)
- **Key files:** JWT RS256 keys auto-generated under `server/keys/` if not set in `.env`; per-org signing keys under `storage/kms/` (owner-only)
- **Document versions:** each draft edit creates an auditable version record

---

## Merkle Trees & Blockchain Anchoring ✅

**Backend routes:**
- `POST /api/v1/merkle/run` — manually trigger batch (admin)
- `GET /api/v1/merkle/batches` — list historical batches

**Features:**
- Daily midnight cron batch (gated by `WORKER=true`)
- LocalAnchor in dev (persistent JSON ledger at `./storage/chain/ledger.json`); Polygon Amoy adapter planned (ethers v6) — stub, not yet wired
- Merkle proofs embedded per document → included in JSON-LD credential download

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
- On-chain anchor status
- Tamper detection (salt/hash/signature mismatch)

**Frontend pages:** `/verify`, `/verify/hash/:hash`, `/verify/:token`

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
- Every action logged: actor, action, entity type/id, old/new values, IP, user-agent
- Retention: STANDARD (90-day auto-purge), COMPLIANCE (7-year archival)

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
| Key Management | LocalKMS (Node crypto) | AWS KMS | ✗ stub |
| Blockchain | LocalAnchor (JSON ledger) | Polygon Amoy (ethers v6) | ✗ stub |
| Payment | MockStripe | Stripe | ✗ stub |
| Email | ConsoleEmail (stdout) | AWS SES | ✗ stub |
| Storage | LocalDisk (`./storage`) | AWS S3 | ✗ stub |
| DNS Verification | LocalDns (always passes) | Real TXT lookup | ✓ wired |

> **Wired today:** all Dev implementations plus the real DNS adapter. Selecting any other prod driver throws `<DRIVER>="..." not implemented` — the prod adapters are interface-ready stubs pending cloud accounts.

---

## Seeded Demo Accounts

Run `npm run db:seed` in `server/`. All accounts use password: `Password123@`

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
`BULK_ISSUANCE_STARTED`/`COMPLETED` compliance-tier audit logs, dual manager+HR signature
from a single KMS signing operation, 90-day expiry, new holders get a magic link.

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
