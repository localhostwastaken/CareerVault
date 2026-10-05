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
  - `documents.revocation_reason_text`
  - `document_versions.content_json`
  - `document_versions.change_summary`
- **PDF Storage:** PDFs stored in S3/Local are also encrypted on disk by `EncryptedStorageService`.

## Cryptographic Guarantees (Document Integrity)
- **Hashing:** `SHA-256(JCS(content_json) + salt)`. Using RFC 8785 JSON Canonicalization Scheme (JCS) ensures deterministic hashes regardless of key order.
- **Dual Signatures:** Manager and HR sign role-bound statements `SHA-256(JCS({v: 1, documentHash, role, memberId}))` using the Organization's KMS key (RSA-2048, PKCS#1 v1.5).
- **Key Storage (IMPLEMENTED):** Organization keys are currently stored via `LocalKmsService`, wrapped by the `KMS_MASTER_KEY`. (AWS KMS is **PLANNED**).

## Privacy and GDPR Erasure
- **Salt-Based Deletion (Dead Hash):** CareerVault achieves "Right to be Forgotten" without breaking the immutable blockchain. Deleting a user wipes their row, their PDFs, and the `salt` from their documents. Without the salt, the on-chain hash is permanently unlinkable and cannot be brute-forced back to the user.
- **IMPLEMENTED Status:** Erasure currently deletes the salt, the document content, and breaks the link to the user. The public lookup returns `erased: true`.

## Trust Boundaries and External Services
- **Blockchain Trust:** Merkle roots are anchored to Polygon Amoy (`AnchorRegistry`). Verification assumes the blockchain's consensus is secure.
- **Offline Verification:** The offline verifier (`tools/verify-credential`) assumes the pinned Registry address (`KNOWN_REGISTRIES`) is authentic. It checks the signature mathematically but out-of-band verification is required to prove the `issuer.publicKeyPem` actually belongs to the claimed organization.
