# CareerVault scope

Decided on 2026-11-14 for the final-year presentation. This file is the authority on what the
product is today. Design: `docs/superpowers/specs/2026-11-14-presentation-scope-cut-design.md`.

## In scope

| Area | What it covers |
|---|---|
| Issuance | A holder requests a document. The assigned manager drafts and signs it with a step-up, and a different HR user co-signs and issues it. |
| Verification | Public verification by document ID or share token, with no account. Five server-side checks. |
| Share links | Free for every holder, can be deactivated, with optional expiry and view limits. |
| Anchoring | Daily (or "Anchor now") Merkle batches on Polygon Amoy. A public receipt that never decides the verdict. |
| Revocation | HR revokes. The database status is authoritative, and an on-chain flag follows. |
| Admin console | Organisation, members, analytics with anchoring, audit log. |
| Signing security | Per-signer employee keys (PBKDF2 → HMAC seal) with step-up at sign and approve. |
| AI matching (use case) | Consented skill extraction, recruiter talent search, ranked matches with explanations. Presented as something built on top of verified credentials, not the main contribution. |

## Future scope (after the year-end evaluation)

Dormant in the repository. Not linked from the UI. Do not raise these in audits or reviews unless asked.

| Item | Where the dormant code lives |
|---|---|
| Billing, subscriptions and payments (mock checkout, Stripe) | `server/src/modules/payment`, `server/src/modules/subscription`, `server/src/config/billing.constants.ts`, `Payment`/`Subscription` tables |
| Verifier API, API keys and bulk verification | `server/src/modules/verifier-key`, `POST /verify/bulk`, `ApiKeyGuard` |
| Bulk issuance | `BulkIssuanceBatch` schema model only |
| Offline or portable proofs, QR verification | Not implemented |
| Demo guide page | `client/src/pages/Demo/DemoGuide.tsx`, route `/demo` (reachable by direct URL only) |
| Engineering-audit findings F01–F21 and additions A1–A10 | Post-year-end hardening. See `PROJECT_ENGINEERING_AUDIT.md`. |

## Removed

| Item | Note |
|---|---|
| SHA-256 lab (`/demo/sha256`) | Deleted on 2026-11-14. Not future scope. |
