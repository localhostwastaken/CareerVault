# Security Model

This document outlines the **IMPLEMENTED** security model of CareerVault.

## Authentication and Session Management
- **Primary Auth:** JWT-based stateless authentication using `@nestjs/passport`.
- **Token Lifecycle:** 
  - Access Tokens (short-lived) are issued on login.
  - Refresh Tokens (long-lived) are stored as cryptographically hashed values (`tokenHash`) in the `refresh_tokens` table.
- **CSRF & Cookies:** Protected via standard web patterns (HttpOnly, Secure cookies in production, and CSRF protection).
- **External Managers:** External non-registered actors (e.g., LOR authors) authenticate via a one-time 15-minute Magic Link (`tokenHash` in `magic_links` table).

## Authorization and RBAC
- **RolesGuard:** Enforces Role-Based Access Control using the `MemberRole` enum (`ORG_ADMIN`, `MANAGER`, `HR`, `RECRUITER`).
- Access bounds are strictly verified against the `organization_members` join table to prevent cross-organization data leakage.

## Data Protection (Envelope Encryption R10)
CareerVault implements rigorous application-level Envelope Encryption (R10) to protect PII and sensitive data.
- **Strict Reads:** In production (`FIELD_ENCRYPTION_STRICT=true`), plaintext values in encrypted columns are rejected.
- **Encryption Flow:** `KMS_MASTER_KEY` → HKDF-SHA256 field KEK → fresh AES-256 data key per row payload → AES-256-GCM.
- **Encrypted Fields:**
  - `documents.content_json`
  - `documents.salt`
  - `documents.manager_signature`
  - `documents.hr_signature`
  - `documents.manager_seal`, `documents.hr_seal`
  - `documents.revocation_reason_text`
  - `document_versions.content_json`
  - `document_versions.change_summary`
- **PDF Storage:** PDFs stored in S3/Local are also encrypted on disk by `EncryptedStorageService`.

## Cryptographic Guarantees (Document Integrity, revised 2026-10-31)
- **Bytes, not text:** `B = documentBytes(id, type, orgId, holderId, subject, salt)` — our own length-prefixed TLV layout (`server/src/common/crypto/document-bytes.ts`). No JSON canonicalisation library. `documentHash = SHA-256(B)`.
- **Personal employee keys:** each MANAGER/HR enrols per organisation. `K = PBKDF2-SHA256(DOB ‖ personal ID ‖ 3 answers, random 16-byte salt, 600,000 iterations)`. `K` is stored only AES-256-GCM-wrapped under a per-org HKDF key derived from `KMS_MASTER_KEY`; the answers are never stored.
- **Step-up:** every signature re-derives `K` from re-entered details and compares it in constant time; 5 failures per user per 15 minutes lock signing. Re-enrolling needs the current details; another org admin can reset a forgotten key.
- **Seal and signature:** `seal = HMAC-SHA256(K, B)`; the org's RSA-2048 key signs `SHA-256(statement(documentHash, seal, role, memberId, keyId))`. The manager does this at signing, HR again with their own key at approval.
- **Verification is server-only** (`/verify/document/:id`, `/verify/:token`): the server recomputes the hash, both seals and both signatures, and returns a verdict without any salt, hash, key, root or algorithm name. The on-chain anchor is a secondary badge.

## Input Hardening
- `PayloadGuardMiddleware` refuses `__proto__`/`constructor`/`prototype` keys, markup, control characters and deep nesting in every body and query string, before any DTO runs.
- Identifier fields use allow-list formats (`server/src/common/validators/formats.ts`); every other field is validated by class-validator with `whitelist` + `forbidNonWhitelisted`.
- All SQL is parameterised (Prisma, tagged `$queryRaw`); ESLint bans `$queryRawUnsafe`/`$executeRawUnsafe`. SQL keywords are not filtered: they are stored as data.
- Prisma error codes map to generic 409/404 responses and 5xx stay generic, so no table, column or stack detail reaches a client.
- Proof: `server/test/adversarial.e2e-spec.ts`.

## Privacy and GDPR Erasure
- **Salt-Based Deletion (Dead Hash):** CareerVault achieves "Right to be Forgotten" without breaking the immutable blockchain. Deleting a user wipes their row, their PDFs, and the `salt` from their documents. Without the salt, the on-chain hash is permanently unlinkable and cannot be brute-forced back to the user.
- **IMPLEMENTED Status:** Erasure currently deletes the salt, the document content, and breaks the link to the user. The public lookup returns `erased: true`.

## Trust Boundaries and External Services
- **Blockchain Trust:** Merkle roots are anchored to Polygon Amoy (`AnchorRegistry`). Verification assumes the blockchain's consensus is secure.
- **Verification depends on CareerVault being up.** The offline verifier and the downloadable credential were removed on 2026-10-31: personal HMAC keys are held on the server, so no third party can recompute a seal. The PDF carries the Document ID, and the chain keeps its public timestamp.
