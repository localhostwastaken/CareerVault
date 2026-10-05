# Architectural Decision Records (ADRs)

This document captures the canonical engineering and architectural decisions made in CareerVault.

---

### ADR-001 — Web 2.5 Architecture over Fully On-Chain Storage
**Status:** Accepted
**Context:** Storing raw career documents on a public blockchain is expensive, slow, and permanently exposes PII.
**Decision:** We chose a Web 2.5 model: relational databases for content and business logic, with only 32-byte cryptographic Merkle roots anchored to the blockchain.
**Why:** Achieves blockchain-grade integrity without compromising GDPR compliance, write latency, or gas costs.
**Trade-offs:** Requires users to trust CareerVault's infrastructure to serve the document content and Merkle proof.
**Evidence:** `server/src/modules/merkle/merkle.service.ts`

### ADR-002 — PostgreSQL with pgvector
**Status:** Accepted
**Context:** We needed relational integrity for RBAC/auth, plus vector similarity search for the AI matchmaking.
**Decision:** We chose PostgreSQL 16+ heavily utilizing the `pgvector` extension.
**Why:** Eliminates the need for a separate vector database (like Pinecone), keeping the infrastructure footprint small and transactional integrity intact.
**Consequences:** Scaling the database requires scaling PostgreSQL horizontally or vertically, rather than scaling a separate specialized service.
**Evidence:** `server/prisma/schema.prisma` (`vector(384)`)

### ADR-003 — NestJS Modular Backend
**Status:** Accepted
**Context:** The application has strict separation of duties (Auth, Crypto, Blockchain, AI, Billing).
**Decision:** NestJS was chosen for its strict module boundary enforcement and Dependency Injection.
**Why:** Prevents circular dependencies and allows mocking heavy external services (Stripe, AWS KMS) trivially.
**Evidence:** `server/src/app.module.ts`

### ADR-004 — Prisma ORM
**Status:** Accepted
**Context:** We needed type-safe database queries synchronized closely with TypeScript domain models.
**Decision:** Prisma was chosen for database migrations and client generation.
**Why:** The schema file serves as a single source of truth that generates strict TS types, preventing SQL injection and shape mismatches.
**Evidence:** `server/prisma/schema.prisma`

### ADR-005 — In-Memory Limits (Redis/BullMQ Planned)
**Status:** Proposed (Design Accepted, Implementation Planned)
**Context:** Rate limiting and job queues are currently handled in-memory via `@nestjs/schedule` and sliding windows.
**Decision:** We designed for Redis and BullMQ, but delayed implementation to minimize early infrastructure cost.
**Why:** The current single-instance deployment does not strictly require distributed locking or queues.
**Evidence:** `server/src/common/guards/api-key.guard.ts`

### ADR-006 — AWS KMS vs LocalKms
**Status:** Proposed (LocalKms Accepted temporarily)
**Context:** Organization signing keys must never be exposed to developers or dumped in database backups.
**Decision:** We architected for AWS KMS, but currently wrap keys using `LocalKmsService` envelope encryption.
**Why:** Development velocity. The architecture cleanly abstracts the crypto interface so the backend can swap to true HSMs without changing business logic.
**Evidence:** `server/src/services/key-management/key-management.service.ts`

### ADR-007 — Organization-Scoped Signing Keys
**Status:** Accepted
**Context:** Dual signatures (Manager + HR) are required. Should each employee have their own cryptographic key?
**Decision:** No. We use a single organization-scoped custodial key for both signatures.
**Why:** Managing thousands of individual employee keypairs causes severe key-loss and rotation nightmares. Separation of duties is enforced via RBAC in the application layer, and role bounds (`role: "MANAGER"`) are baked into the signed statement.
**Trade-offs:** If the org key leaks, the attacker can forge both roles (though they still require DB access to issue).
**Evidence:** `server/src/modules/document/document.service.ts`

### ADR-008 — Pinning Historical Signing Public Keys
**Status:** Accepted
**Context:** If an organization rotates its compromised KMS key, all previously issued documents would instantly fail verification against the new key.
**Decision:** `signing_public_key_pem` is pinned to the `documents` row at the moment of signing.
**Why:** Verification checks the document against the key that was active *when it was signed*, allowing seamless key rotation without invalidating historical credentials.
**Evidence:** `server/prisma/schema.prisma` (`signingPublicKeyPem` column)

### ADR-009 — Separating Digital Signatures from Blockchain Anchoring
**Status:** Accepted
**Context:** Immediate issuance vs. Blockchain finality.
**Decision:** Documents are signed immediately via RSA, but batched to the blockchain nightly via Merkle Trees.
**Why:** Polygon Amoy transactions take time and cost gas. Users shouldn't wait for block confirmations to download their signed PDF. A document is valid (`VERIFIED_PENDING_ANCHOR`) instantly via signature, and achieves immutable integrity the next day.
**Evidence:** `server/src/modules/verification/verification.service.ts`

### ADR-010 — Salted Hashing for GDPR Erasure
**Status:** Accepted
**Context:** Blockchains are immutable. GDPR requires the "Right to be Forgotten".
**Decision:** The document hash is computed as `SHA-256(JCS(content) + random_salt)`.
**Why:** When a user requests erasure, the system deletes the `salt` from the database. Without the salt, the on-chain hash is mathematically "dead" and cannot be brute-forced or linked back to the user's plain-text data.
**Evidence:** `server/test/erasure.e2e-spec.ts`

### ADR-011 — Merkle Batching
**Status:** Accepted
**Context:** Emitting a smart contract transaction per document is cost-prohibitive.
**Decision:** Thousands of document hashes are compiled into a daily Merkle Tree, and only the 32-byte root is anchored.
**Why:** Amortizes the gas cost of anchoring to practically zero per document.

### ADR-012 — Permissionless Public Verification
**Status:** Accepted
**Context:** Background check agencies need to verify documents.
**Decision:** Any user with a document hash or credential file can verify it offline or via the public `/api/v1/verify` endpoint without an account.
**Why:** Maximizes the utility of the platform. Privacy is maintained because the verifier must already possess the document (and its salt) to generate the hash.

### ADR-013 — Separating Revocation from Integrity
**Status:** Accepted
**Context:** If a document is issued by mistake, how is it invalidated?
**Decision:** Revocation is handled in the relational database (`status = REVOKED`), not on the blockchain.
**Why:** On-chain revocation registries are complex and costly. Because verification queries CareerVault's API, the DB remains the authoritative source for revocation, while the blockchain proves the document hasn't been tampered with since issuance.
**Evidence:** `server/src/modules/document/document-revoke.spec.ts`

### ADR-014 — Tri-State Authentication
**Status:** Accepted
**Context:** External Managers (e.g., University professors writing LORs) won't register for an account.
**Decision:** The frontend supports tri-state authentication (Unauthenticated, Magic-Link 15m JWT, Registered User JWT).
**Why:** Reduces friction for external signers to zero, while maintaining strict session security for HR/Admins.

### ADR-015 — Memory-Only Access Tokens
**Status:** Accepted
**Context:** Storing JWT access tokens in localStorage exposes them to XSS attacks.
**Decision:** Access tokens are kept purely in React memory. Refresh tokens are stored in `HttpOnly` Secure cookies.
**Why:** Eliminates the risk of XSS token theft.

### ADR-016 — Deterministic TreeSHAP for Explainable AI (XAI)
**Status:** Accepted
**Context:** Recruiters need to know *why* a candidate was ranked highly, to avoid algorithmic bias.
**Decision:** Instead of using an LLM to hallucinate an explanation, the `ai-service` uses LightGBM's native TreeSHAP algorithm to compute mathematically rigorous feature attributions.
**Why:** Ensures compliance with EU AI Act explainability requirements by providing deterministic, reproducible attributions.
**Evidence:** `ai-service/app/ranking.py`
