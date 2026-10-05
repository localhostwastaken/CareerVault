# CareerVault Implementation Status

**Purpose:** This document is the single canonical source of truth for the implementation status of features in CareerVault, directly reflecting the repository code as of September 2026.

## Current Project Maturity
- **Core application status:** Robust and feature-complete. The document lifecycle from drafting to HR approval and issuance is fully functional.
- **Security status:** Envelope encryption (R10) is active. Strict reads and dual signatures are in production.
- **Cryptographic status:** Deterministic JSON serialization (JCS), salted SHA-256 hashing, and RS256 signing are fully operational.
- **Blockchain status:** Implemented on Polygon Amoy testnet. Nightly Merkle anchoring jobs execute properly.
- **AI/XAI status:** Extracted skills and talent ranking use LightGBM TreeSHAP for rigorous feature attribution.
- **Testing status:** Unit tests cover crypto operations. E2E browser testing via Playwright is implemented.
- **Deployment status:** Deployed across Render, Vercel, and Supabase.

## Status Matrix

| Area | Feature | Status | Evidence | Notes |
|---|---|---|---|---|
| **Frontend** | React 19 / Vite / Tailwind 4 | IMPLEMENTED | `client/package.json` | Modern stack with shadcn/ui. |
| **Authentication** | Password + Magic Link | IMPLEMENTED | `server/src/modules/auth/auth.service.ts` | 15-minute magic links for external managers. |
| **Session restoration** | Refresh Tokens | IMPLEMENTED | `server/src/modules/auth/refresh.service.ts` | Stored cryptographically hashed. |
| **JWT** | Access Tokens | IMPLEMENTED | `server/src/common/guards/jwt-auth.guard.ts` | Short-lived, memory-only access bounds. |
| **CSRF & Cookies** | HttpOnly Cookies | IMPLEMENTED | `server/src/modules/auth/auth.controller.ts` | Set-Cookie on login/refresh. |
| **RBAC** | `@Roles` Guard | IMPLEMENTED | `server/src/common/guards/roles.guard.ts` | Enum: ORG_ADMIN, MANAGER, HR, RECRUITER. |
| **Organizations** | DNS Verification | IMPLEMENTED | `server/src/modules/organization/` | Root DID minted upon TXT record match. |
| **Members** | Multi-role join table | IMPLEMENTED | `server/prisma/schema.prisma` | Users can hold roles in multiple orgs. |
| **Manager workflow** | Draft & Sign | IMPLEMENTED | `server/src/modules/document/document.service.ts` | Drafts transition to `PENDING_HR`. |
| **HR workflow** | Approve & Co-sign | IMPLEMENTED | `server/src/modules/document/document-approve.spec.ts` | HR triggers final issuance & PDF generation. |
| **Holder workflow** | Wallet & Link sharing | IMPLEMENTED | `server/src/modules/share-link/` | Paid/premium links. |
| **Document issuance** | Bulk & Single Issuance | IMPLEMENTED | `server/src/modules/bulk-issuance/` | Handles CSV bulk issuance by HR. |
| **PDF generation** | Human-readable artifacts | IMPLEMENTED | `server/src/modules/document/pdf-generation.service.ts` | Hash in footer. Encrypted on disk. |
| **Document versions** | Complete audit trail | IMPLEMENTED | `server/prisma/schema.prisma` | Stores complete snapshot per version. |
| **Digital signatures** | Dual Role-bound RSA | IMPLEMENTED | `server/src/modules/document/document.service.ts` | Distinct statement signatures. |
| **KMS** | Hardware Security Module | PLANNED | `server/src/services/key-management/key-management.service.ts` | Currently uses `LocalKmsService` (envelope-wrapped). |
| **Key rotation** | Org Key Replacement | IMPLEMENTED | `server/src/modules/organization/` | `signing_public_key_pem` is pinned per document. |
| **Hashing** | `SHA-256(JCS(content)+salt)` | IMPLEMENTED | `server/src/modules/document/document.service.ts` | 32-byte hash. |
| **Canonicalization** | RFC 8785 (JCS) | IMPLEMENTED | `tools/verify-credential/verify-credential.mjs` | Used in `credentialSubject`. |
| **Salting** | GDPR Dead Hashing | IMPLEMENTED | `server/src/modules/user/user.service.ts` | Enables unlinkability upon erasure. |
| **Merkle tree** | Batching to Root | IMPLEMENTED | `server/src/modules/merkle/` | Midnight cron job batches `ISSUED` docs. |
| **Integrity gate** | Pre-anchor strict check | IMPLEMENTED | `server/src/modules/merkle/merkle.service.ts` | Skips docs that fail decryption/hash check. |
| **Blockchain anchoring**| Polygon Anchoring | IMPLEMENTED | `server/src/services/blockchain/amoy-driver.ts` | Posts the 32-byte Merkle root. |
| **Smart contract** | `AnchorRegistry.sol` | IMPLEMENTED | `contracts/contracts/AnchorRegistry.sol` | Replaces `MerkleRootRegistry`. |
| **Polygon deployment** | Amoy Testnet | IMPLEMENTED | `contracts/deployments/amoy.json` | Confirmed deployed on Polygon Amoy. |
| **Public verification** | Six-step crypto check | IMPLEMENTED | `server/src/modules/verification/` | Validates hash, signatures, merkle, and chain. |
| **Revocation** | Org-level revocation | IMPLEMENTED | `server/src/modules/document/document-revoke.spec.ts` | Fails verification immediately. |
| **GDPR erasure** | Data & Salt wipe | IMPLEMENTED | `server/test/erasure.e2e-spec.ts` | Leaves on-chain hash cryptographically dead. |
| **Offline verifier** | Zero-dependency checks | IMPLEMENTED | `tools/verify-credential/` | Command-line Node verifier. |
| **Browser verifier** | Proof-file check at `/verify/file` | IMPLEMENTED | `client/src/features/credential-check/` | Same checks and verdicts as the CLI, run in the browser against public Amoy RPCs; includes a tamper test. |
| **Trust status** | `GET /health/status` | IMPLEMENTED | `server/src/health/system-status.service.ts` | Public chain, contract, wallet and encryption settings for the UI. |
| **Demo guide** | `/demo` | IMPLEMENTED | `client/src/pages/Demo/DemoGuide.tsx` | Live ledger and encryption facts, a browser chain pre-flight, seeded accounts and the click path. |
| **Skill extraction** | NLP / Parsing | IMPLEMENTED | `ai-service/app/main.py` | Extracts `skillsJson` and embeddings. |
| **Recruiter search** | pgvector L2/HNSW | IMPLEMENTED | `server/src/modules/recruiter/talent.service.ts` | Vector similarity. |
| **Talent ranking** | ML Model Ranking | IMPLEMENTED | `ai-service/app/ranking.py` | LightGBM gradient boosting model. |
| **XAI** | Deterministic TreeSHAP | IMPLEMENTED | `ai-service/app/ranking.py` | Native LightGBM `pred_contrib=True`. |
| **Payments** | Stripe Billing/Metering | DESIGNED | `server/src/services/payment/mock-stripe.service.ts` | Uses `MockStripeService` driver currently. |
| **Email** | AWS SES | PLANNED | `server/src/services/email/email.module.ts` | Uses Console/Gmail mock currently. |
| **S3** | Cloud Object Storage | PLANNED | `server/src/services/storage/supabase-storage.service.ts` | Uses Supabase Storage as pseudo-S3. |
| **Redis** | In-memory Datastore | PLANNED | `server/src/common/guards/api-key.guard.ts` | Limits are currently sliding in-memory windows. |
| **BullMQ** | Job Queueing | PLANNED | `server/src/app.module.ts` | Uses NestJS `@nestjs/schedule` internally. |
| **Audit logging** | Entity-level actions | IMPLEMENTED | `server/src/modules/audit/audit.module.ts` | Recorded across 2 retention tiers. |
| **E2E testing** | Browser Playwright | IMPLEMENTED | `e2e/README.md` | Runs against isolated `careervault_e2e` DB. |
| **CI/CD** | Pipeline automation | PARTIALLY IMPLEMENTED | `render.yaml` | Render auto-deploys, but no GitHub Actions. |
| **Deployment** | Vercel, Render, Supabase| IMPLEMENTED | `documentation/deployment.md` | Active deployed infrastructure. |
