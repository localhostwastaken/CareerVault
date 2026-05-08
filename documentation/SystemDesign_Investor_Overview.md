# CareerVault -- Technical Architecture Overview (Investor Edition)

> **Version:** 1.0.0
> **Last Updated:** 2026-03-25
> **One-liner:** A career document verification platform that combines a traditional database with blockchain anchoring for tamper-proof, verifiable experience letters, recommendations, and salary proofs.

---

## Table of Contents

1. [Objective](#1-objective)
2. [Motivation](#2-motivation)
3. [Problem Statement](#3-problem-statement)
4. [Algorithm -- How Merkle Trees Work](#4-algorithm----how-merkle-trees-work)
5. [What CareerVault Does](#5-what-careervault-does)
6. [Who Uses It (User Roles)](#6-who-uses-it-user-roles)
7. [How a Document Gets Created & Verified](#7-how-a-document-gets-created--verified)
8. [The "Web 2.5" Architecture](#8-the-web-25-architecture)
9. [High Level System Architecture](#9-high-level-system-architecture)
10. [System Components & Tech Stack](#10-system-components--tech-stack)
11. [Data Model (Simplified)](#11-data-model-simplified)
12. [Document Lifecycle](#12-document-lifecycle)
13. [Verification -- The Six-Step Integrity Check](#13-verification----the-six-step-integrity-check)
14. [Revenue Model & Payment Flows](#14-revenue-model--payment-flows)
15. [Security, Privacy & Compliance](#15-security-privacy--compliance)
16. [Smart Contract (On-Chain)](#16-smart-contract-on-chain)
17. [Key Design Decisions](#17-key-design-decisions)

---

## 1. Objective

Build a **trusted, tamper-proof career document ecosystem** where companies can issue digitally signed experience letters, salary proofs, and recommendation letters, and any recruiter anywhere in the world can independently verify their authenticity in seconds -- without calling HR.

---

## 2. Motivation

Credential fraud is rampant. According to industry surveys, over **30% of job applicants misrepresent their employment history**. Background verification is slow (days to weeks), expensive ($30–$100 per check), and still fails when companies don't respond. Meanwhile, candidates carry no portable proof of their own work history.

CareerVault flips the model: **put the verified proof in the employee's hands**, cryptographically signed by their employer and immutably timestamped on a public blockchain.

---

## 3. Problem Statement

| Pain Point | Who Feels It | Current Workaround |
|---|---|---|
| Fake or inflated experience letters | Recruiters & companies | Slow manual background checks |
| No portable proof of employment | Employees / candidates | Hoping HR responds to verification calls |
| No way to prove a document is unaltered | Verifiers | Trust-based, no cryptographic guarantee |
| Revoked documents still circulating | Issuers (companies) | No mechanism to invalidate distributed copies |
| GDPR vs. immutable records conflict | Platform operators | Typically ignored or handled poorly |

CareerVault solves all five: digital signatures prove authenticity, blockchain anchoring proves integrity, share links give employees portability, revocation propagates instantly, and salt-based GDPR deletion makes on-chain hashes unlinkable without breaking the blockchain.

---

## 4. Algorithm -- How Merkle Trees Work

Instead of writing every document to the blockchain (costly), CareerVault batches documents daily using a **Merkle tree** -- a binary tree of cryptographic hashes.

```mermaid
graph BT
    L1[Hash: Doc A] --> N1[Hash: A+B]
    L2[Hash: Doc B] --> N1
    L3[Hash: Doc C] --> N2[Hash: C+D]
    L4[Hash: Doc D] --> N2
    N1 --> Root[Merkle Root]
    N2 --> Root

    style Root fill:#fff3e0
```

**How it works:**

1. Each issued document is hashed individually (SHA-256 of its content + a random salt).
2. Hashes are paired and hashed together, level by level, until a single **root hash** remains.
3. Only the root hash is written to the Polygon blockchain -- **one transaction for thousands of documents**.
4. Each document gets a **Merkle proof**: a small set of sibling hashes that lets anyone independently recompute the root and confirm inclusion.

**Why it matters:** To verify Document A, you only need its hash and 2–3 sibling hashes (not all documents). This is efficient, private, and independently verifiable by anyone with the public blockchain record.

---

## 5. What CareerVault Does

CareerVault lets companies **issue cryptographically signed career documents** (experience letters, salary proofs, recommendation letters) to employees. These documents are:

- **Digitally signed** by both the issuing manager and an HR approver using cloud-based keys (AWS KMS).
- **Hashed and anchored on the Polygon blockchain** nightly, creating an immutable proof-of-existence.
- **Verifiable by anyone** (recruiters, background-check firms) through a simple link -- no account needed.

Think of it as a **digital notary for career documents**, where the "notary stamp" lives on a public blockchain.

---

## 6. Who Uses It (User Roles)

```mermaid
graph LR
    OrgAdmin((Org Admin)) -->|Sets up company, manages team| Platform[CareerVault]
    Manager((Manager)) -->|Drafts & signs documents| Platform
    HR((HR / Approver)) -->|Reviews, approves, can bulk-issue| Platform
    Holder((Employee / Holder)) -->|Requests docs, shares with recruiters| Platform
    Verifier((Recruiter / Verifier)) -->|Checks document authenticity| Platform
```

| Role | What They Do | Auth Method |
|---|---|---|
| **Org Admin** | Registers company, proves domain ownership via DNS, manages team roles, handles subscription tier | Email/password + JWT |
| **Manager / Issuer** | Drafts and cryptographically signs documents for employees | Magic link (passwordless, 15-min expiry) or email/password |
| **HR / Approver** | Reviews documents, co-signs, can revoke, and handles bulk issuance via CSV | Email/password + JWT |
| **Holder / Employee** | Requests documents, downloads PDFs, generates shareable links | Email/password + JWT |
| **Verifier / Recruiter** | Opens shared links to verify document authenticity -- no account needed | No auth required |

A single person can hold multiple roles (e.g., be a Manager at Company A and a Holder at Company B).

---

## 7. How a Document Gets Created & Verified

### The Happy Path (End-to-End)

```mermaid
flowchart TD
    A[Employee requests a document] --> B[Manager receives email with magic link]
    B --> C[Manager fills in document details & signs digitally]
    C --> D[HR reviews and co-signs]
    D --> E[PDF generated & stored in cloud]
    E --> F[Nightly batch: document hash anchored on Polygon blockchain]
    F --> G[Employee gets a shareable link]
    G --> H[Recruiter opens link & sees verification report]

    style A fill:#e1f5fe
    style F fill:#fff3e0
    style H fill:#e8f5e9
```

**In plain English:**

1. An employee requests an experience letter from their company on CareerVault.
2. Their manager gets an email with a secure one-time link, fills in the letter content, and digitally signs it.
3. HR reviews the content against company records, approves it, and adds a second digital signature.
4. A professional PDF is generated and stored securely (AWS S3).
5. Every night at midnight, all newly issued documents are grouped into a **Merkle tree** (a cryptographic data structure), and the tree's "root hash" is recorded on the Polygon blockchain -- creating an immutable timestamp.
6. The employee generates a shareable link (free for premium users, small fee otherwise) and sends it to a recruiter.
7. The recruiter opens the link and instantly sees a **verification report**: is the content untampered? Are the signatures valid? Is it on the blockchain? Has it been revoked or expired?

---

## 8. The "Web 2.5" Architecture

CareerVault is **not a fully decentralized app**. It's a traditional web application (SQL database, REST API) that uses blockchain as a **trust anchor** -- we call this "Web 2.5."

```mermaid
graph TB
    subgraph "Web 2 Layer (Traditional)"
        API[NestJS Backend API]
        DB[(PostgreSQL Database)]
        S3[AWS S3 - PDF Storage]
        KMS[AWS KMS - Signing Keys]
        Stripe[Stripe - Payments]
    end

    subgraph "Web 3 Layer (Blockchain)"
        Polygon[Polygon PoS Network]
        Contract[AnchorRegistry Smart Contract]
        IPFS[IPFS - Decentralized Backup]
        GitHub[GitHub Transparency Repo]
    end

    API --> DB
    API --> S3
    API --> KMS
    API --> Stripe
    API --> Polygon
    API --> IPFS
    API --> GitHub
    Polygon --> Contract
```

**Why this approach?**

| Concern | Our Solution |
|---|---|
| Speed & cost | All reads/writes go through PostgreSQL (milliseconds, free). Blockchain is only used for the daily anchor (one transaction/day, ~$0.01 on Polygon). |
| User experience | Users interact with a normal web app. No wallets, no gas fees, no seed phrases. |
| Trust & tamper-proofing | The nightly blockchain anchor means that even if our database were compromised, anyone can independently verify a document against the public blockchain record. |
| Resilience | Merkle roots are published in **three places**: Polygon blockchain, IPFS, and a public GitHub repo. Even if two fail, the proof survives. |

---

## 9. High Level System Architecture

### 9.1 Application Architecture

```mermaid
flowchart TD
    subgraph Frontend["Frontend — React + Vite"]
        direction LR
        HD["Holder Dashboard"]
        HRP["HR / Manager Portal"]
        VP["Verifier Page (Public)"]
        AC["Admin Console"]
    end

    subgraph Services["Backend Services — NestJS"]
        direction LR
        AUTH["Auth\nJWT · Magic Links · bcrypt"]
        DOC["Document Engine\nDraft · Sign · Approve · PDF"]
        MERKLE["Merkle Engine\nBatch · Proof · Anchor"]
        NOTIFY["Notifications\nEmail + In-App"]
        PAY["Payments\nStripe"]
        KMS_SVC["Key Management\nKMS + Vault"]
        AUDIT["Audit\n90-day / 7-year"]
    end

    subgraph Data["Data Layer"]
        direction LR
        PG[("PostgreSQL 16")]
        REDIS[("Redis 7")]
        S3["AWS S3"]
    end

    subgraph Blockchain["Web 3.0 Layer"]
        direction LR
        SC["MerkleRootRegistry\n(Polygon PoS)"]
        MIRROR["IPFS + GitHub"]
    end

    subgraph External["External Services"]
        direction LR
        STRIPE["Stripe"]
        SES["AWS SES"]
        DNS["DNS Resolver"]
        KMS["AWS KMS"]
        VAULT["HashiCorp Vault"]
    end

    Frontend -->|"HTTPS / REST"| Services

    AUTH --> PG & REDIS
    AUTH -->|"TXT Lookup"| DNS
    DOC --> PG & S3 & KMS_SVC
    MERKLE --> PG & REDIS
    MERKLE -->|"Midnight Cron"| SC
    MERKLE --> MIRROR
    NOTIFY --> SES
    PAY --> STRIPE
    KMS_SVC --> KMS & VAULT

    style Frontend fill:#e3f2fd,stroke:#1565c0,color:#000
    style Services fill:#f3e5f5,stroke:#6a1b9a,color:#000
    style Data fill:#e8f5e9,stroke:#2e7d32,color:#000
    style Blockchain fill:#fce4ec,stroke:#b71c1c,color:#000
    style External fill:#fff3e0,stroke:#e65100,color:#000
```

**Frontend (React + Vite):** Four route-separated views compiled into a single SPA. No SSR -- the Verifier page is publicly accessible with no auth; all other views are JWT-gated.

| View | Users | Key Features |
|---|---|---|
| Holder Dashboard | Employees | Career wallet, document requests, share link generation, subscription, GDPR deletion |
| HR / Manager Portal | HR & Managers | Approval queue, document drafting, bulk CSV issuance, revocation |
| Verifier Page | Recruiters (no login) | Paste share-link token → instant six-step verification report |
| Admin Console | Org Admins | DNS verification, member management, KMS key rotation, audit logs |

**API Gateway Layer:** All requests flow through WAF → CloudFront → ALB → Redis rate limiter → NestJS router. Rate limits are endpoint-sensitive: 5 req/min on auth endpoints, 100 req/min on document operations, 30 req/min on public verification.

**Backend Services (NestJS modules with DI):**

| Service | Responsibility |
|---|---|
| Auth | Registration, login (bcrypt, cost factor 12), JWT (15-min access / 7-day refresh), magic link generation & validation |
| Document Engine | Full document lifecycle: draft → sign → HR approve → PDF generation (Puppeteer) → S3 upload → share link → revoke |
| Merkle Engine | Midnight BullMQ cron: collect ISSUED docs → JCS-canonicalize → SHA-256 hash → build Merkle tree → anchor root to Polygon → store proofs → update PDFs |
| Notification | Email (SES) + in-app notifications for every lifecycle event |
| Payment | Stripe subscriptions ($5/mo), per-link Payment Intents, verifier usage billing, webhook processing |
| Key Management | Wraps AWS KMS (envelope encryption) + HashiCorp Vault Transit Engine (document signing). Keys never leave hardware — signing happens inside Vault |
| Audit | Structured audit log writes. `COMPLIANCE` tier (7-year): issuance, revocation, anchoring. `STANDARD` tier (90-day): logins, edits, link views |

---

### 9.2 Deployment Architecture

```mermaid
flowchart TB
    subgraph Edge["Edge Layer"]
        WAF2["AWS WAF<br/>(SQL Injection, XSS, Rate-based rules)"]
        CF2["CloudFront CDN<br/>(TLS 1.3, HSTS, CSP headers)"]
    end

    subgraph Compute["Compute (ECS Fargate — ap-south-1)"]
        ALB2["ALB<br/>(TLS termination, health checks)"]
        subgraph ECS["ECS Fargate Auto-scaling"]
            API1["NestJS API<br/>(Instance 1)"]
            API2["NestJS API<br/>(Instance 2..N)"]
            WORKER["Worker Container<br/>(BullMQ: Merkle cron, PDF gen, Email)"]
        end
    end

    subgraph Storage["Data Layer"]
        RDS["RDS PostgreSQL 16<br/>(Multi-AZ, AES-256, auto-backup)"]
        EC2["ElastiCache Redis 7<br/>(Cluster mode, VPC-only)"]
        S3B["S3 Bucket<br/>(SSE-KMS, no public access)"]
    end

    subgraph Security["Security Services"]
        KMS2["AWS KMS<br/>(Master keys, annual auto-rotation)"]
        SM["Secrets Manager<br/>(DB creds, API keys — 30-day rotation)"]
        HCV["HashiCorp Vault<br/>(Signing keys, Transit Engine)"]
    end

    subgraph Obs["Observability"]
        CW["CloudWatch<br/>(Structured Pino logs, alarms)"]
        SENTRY["Sentry<br/>(Error tracking, performance)"]
        XRAY["AWS X-Ray<br/>(Distributed tracing)"]
    end

    BROWSER["Browser / API Client"] -->|HTTPS| WAF2 --> CF2
    CF2 -->|Dynamic| ALB2
    CF2 -->|Static Assets| S3B
    ALB2 --> API1 & API2
    API1 & API2 & WORKER --> RDS & EC2 & S3B & KMS2 & SM
    WORKER --> HCV
    WORKER -->|Midnight cron| POLYGON["Polygon RPC"]
    WORKER --> SES2["AWS SES"] & GH_IPFS["GitHub / IPFS"]
    API1 & API2 --> STRIPE2["Stripe API"]
    API1 & API2 & WORKER --> CW & SENTRY & XRAY

    style Edge fill:#fff9c4,stroke:#f9a825,color:#000
    style Compute fill:#f3e5f5,stroke:#6a1b9a,color:#000
    style Storage fill:#e8f5e9,stroke:#2e7d32,color:#000
    style Security fill:#ffebee,stroke:#c62828,color:#000
    style Obs fill:#e0f7fa,stroke:#00695c,color:#000
```

- **ECS Fargate:** Serverless containers — no EC2 management. API containers auto-scale on CPU (target 70%, min 2 / max 10 tasks). Worker container scales independently (min 1 / max 3).
- **Zero-downtime deploys:** ALB connection draining (30s) + rolling ECS task updates. Automated rollback if health checks fail within 5 minutes.
- **RDS:** Multi-AZ PostgreSQL 16 with point-in-time recovery, 7-day backups, and read replicas when read traffic exceeds 70% of primary capacity.
- **Redis:** ElastiCache cluster mode. Handles sessions, BullMQ jobs, rate limiter state, magic link token TTLs, and application cache.

---

### 9.3 Security Architecture

```mermaid
flowchart LR
    CLIENT["Client"] -->|HTTPS| WAF3["WAF<br/>(Managed rule sets,<br/>IP reputation, DDoS)"]
    WAF3 --> RL2["Rate Limiter<br/>Sliding window<br/>per endpoint class"]
    RL2 --> AUTH2["Auth<br/>JWT verify → Role guard<br/>→ Org scope check"]
    AUTH2 --> SVC["Service Layer<br/>Input validation (Zod)<br/>Parameterized queries (Prisma)<br/>Output sanitization"]
    SVC --> KEYS["Key Ops<br/>AWS KMS (envelope encrypt)<br/>Vault Transit (doc signing)"]
    KEYS --> STORE["Encrypted Storage<br/>RDS AES-256 · S3 SSE-KMS<br/>Redis TLS · Pre-signed URLs"]
```

| Layer | Mechanism |
|---|---|
| Perimeter | AWS WAF managed rules (SQLi, XSS, bot signatures), CloudFront TLS 1.3, HSTS, strict CSP |
| Auth | bcrypt cost-12 passwords; magic links stored as SHA-256 hashes in Redis (raw token never persisted) |
| Tokens | JWT RS256: 15-min access token + 7-day HTTP-only refresh cookie (rotated on each use) |
| RBAC | NestJS guards enforce `ORG_ADMIN / HR / MANAGER / HOLDER` per route; all queries org-scoped at service layer |
| Signing | Vault Transit Engine — org signing keys never leave Vault hardware; every sign operation audit-logged |
| Encryption | RDS: AES-256 at rest + application-layer envelope encryption for sensitive fields; S3: SSE-KMS; Redis: TLS in transit + at rest |
| Secrets | All credentials in AWS Secrets Manager with 30-day automatic rotation |

---

### 9.4 Integration Architecture

```mermaid
flowchart LR
    subgraph Platform["CareerVault (NestJS API + BullMQ Worker)"]
        API3["API"]
        WRK["Worker"]
    end

    API3 -->|"TXT record lookup<br/>(dns.resolveTxt)"| DNS3["DNS Provider"]
    API3 -->|"Magic links,<br/>Notifications"| SES3["AWS SES"]
    API3 -->|"Checkout, Subscriptions,<br/>Usage billing"| STRIPE3["Stripe"]
    STRIPE3 -->|"Webhooks<br/>(signature-verified)"| API3
    API3 -->|"PutObject / GetObject<br/>(pre-signed, 15-min expiry)<br/>DeleteObject (GDPR)"| S3_3["AWS S3"]
    API3 -->|"Encrypt / Decrypt<br/>GenerateDataKey"| KMS3["AWS KMS"]

    WRK -->|"storeRoot(date, hash)<br/>ethers.js v6"| RPC3["Polygon RPC<br/>(Alchemy / Infura fallback)"]
    WRK -->|"Commit roots/{date}.json"| GH3["GitHub<br/>(public transparency repo)"]
    WRK -->|"Pin JSON<br/>(Pinata / Infura IPFS)"| IPFS3["IPFS"]
    WRK -->|"Sign via Transit Engine"| VAULT3["HashiCorp Vault"]
```

| Integration | Protocol / SDK | Purpose |
|---|---|---|
| AWS KMS | AWS SDK v3 | Envelope encryption of sensitive DB fields; master key management |
| HashiCorp Vault | Vault HTTP API (Transit) | Document signing — keys never exported |
| Polygon PoS | ethers.js v6 (Alchemy primary + Infura fallback) | Daily Merkle root anchoring |
| AWS S3 | AWS SDK v3 (pre-signed URLs, 15-min expiry) | PDF storage with zero public access |
| Stripe | Stripe Node SDK + webhook signature verification | Subscriptions, one-time payments, usage billing |
| AWS SES | AWS SDK v3 (DKIM + SPF configured) | All transactional email |
| IPFS | Pinata pinning API | Decentralized Merkle tree backup |
| GitHub | GitHub REST API | Public transparency repo for daily roots |
| DNS | Node.js `dns.resolveTxt()` | Org domain ownership verification during onboarding |

---

## 10. System Components & Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend** | React + Vite | React 18, Vite 5 | SPA with fast HMR dev builds; TailwindCSS + shadcn/ui (Radix primitives) for UI |
| **Backend API** | NestJS (Node.js 20 LTS) | NestJS 10+ | Modular, DI-based REST API with guards, interceptors, and pipes for RBAC |
| **Language** | TypeScript | 5 | Shared types frontend ↔ backend; Prisma generates DB types automatically |
| **ORM** | Prisma | 5+ | Type-safe queries, auto-migrations, parameterized SQL (prevents injection by default) |
| **Database** | PostgreSQL | 16 | ACID, JSONB for document payloads, complex joins for org membership model |
| **Cache & Queues** | Redis + BullMQ | Redis 7, BullMQ 5+ | Sessions, rate limiting, magic link TTLs, midnight Merkle cron, bulk issuance jobs |
| **File Storage** | AWS S3 | — | PDF storage; SSE-KMS encryption; pre-signed URLs (15-min expiry); no public access |
| **Key Management** | AWS KMS + HashiCorp Vault | — | KMS: envelope encryption of DB fields. Vault Transit: document signing (keys never exported) |
| **Payments** | Stripe | Node SDK | Subscriptions, Payment Intents, usage metering, coupon-based discounts |
| **Email** | AWS SES | — | DKIM/SPF-configured transactional email for magic links and notifications |
| **Blockchain** | Polygon PoS | — | ~$0.01/tx Merkle root anchoring via ethers.js v6 (Alchemy primary / Infura fallback) |
| **Smart Contract** | Solidity | 0.8+ | Minimal `MerkleRootRegistry` (~20 lines); `storeRoot(date, hash)` + `revokeDocument(hash)` |
| **Merkle Trees** | merkletreejs | Latest | SHA-256, sorted pairs, deterministic proof generation |
| **PDF Generation** | Puppeteer + pdf-lib | — | Puppeteer renders HTML → PDF; pdf-lib embeds Merkle proof in PDF metadata |
| **Canonicalization** | JCS (RFC 8785) | `canonicalize` npm | Deterministic JSON serialization before hashing — same content always = same hash |
| **IPFS** | Pinata / Infura IPFS | — | Decentralized Merkle root backup |
| **Transparency** | GitHub REST API | — | Public `roots/YYYY-MM-DD.json` commits for independent verification |
| **Deployment** | ECS Fargate + ALB | — | Serverless containers, auto-scaling (2–10 API tasks, 1–3 worker tasks), rolling deploys |
| **CDN / WAF** | CloudFront + AWS WAF | — | Edge caching, TLS 1.3, HSTS, CSP, DDoS and injection protection |
| **Observability** | CloudWatch + Sentry + X-Ray | — | Structured Pino logs, error tracking, distributed tracing |
| **CI/CD** | GitHub Actions + ECR | — | Lint → type-check → test → Docker build → ECS deploy on merge to `main` |
| **Testing** | Jest + Supertest + Playwright | — | Unit, HTTP integration, and E2E cross-browser tests |

---

## 11. Data Model (Simplified)

The platform has **13 database tables**. Here's the simplified view of the core entities:

```mermaid
erDiagram
    Users ||--o{ OrgMembers : "has roles at"
    Organizations ||--o{ OrgMembers : "has team"
    Users ||--o{ Documents : "holds"
    Organizations ||--o{ Documents : "issues"
    Documents ||--o{ SharedLinks : "shared via"
    Documents ||--o| MerkleProofs : "anchored by"
    MerkleRoots ||--o{ MerkleProofs : "covers"
    Users ||--o{ Payments : "makes"
    Users ||--o{ Subscriptions : "subscribes"
```

### Core Tables at a Glance

| Table | What It Stores | Key Fields |
|---|---|---|
| **users** | Everyone on the platform (employees, managers, admins) | email, name, password hash, GDPR deletion timestamp |
| **organizations** | Companies using CareerVault | name, domain, DNS verification status, KMS key reference, subscription tier |
| **organization_members** | Who has what role at which company | user, org, role (ADMIN / MANAGER / HR), active status |
| **documents** | The core asset -- career documents | type, status, content (JSON-LD), hash, dual signatures, expiry, revocation info |
| **merkle_roots** | Daily blockchain anchoring batches | root hash, Polygon tx hash, IPFS CID, GitHub commit, document count |
| **document_merkle_proofs** | Individual proof that a document was in a batch | proof path (array of hashes), leaf index |
| **shared_links** | Shareable URLs for documents | token, view count, max views, expiry, payment reference |
| **subscriptions** | Recurring billing (Holder Premium, Verifier API) | tier, Stripe subscription ID, billing period |
| **payments** | All financial transactions | amount, type (subscription / one-time link / API access), Stripe reference |
| **magic_links** | Passwordless authentication tokens | hashed token, purpose, 15-min expiry, single-use |
| **notifications** | In-app + email notification log | type, read status, metadata for deep-linking |
| **audit_logs** | Compliance trail | actor, action, before/after snapshots, retention tier (90-day or 7-year) |
| **document_versions** | Edit history before issuance | version snapshots, who changed what |

---

## 12. Document Lifecycle

Every document goes through a clear state machine:

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Employee requests or Manager creates

    DRAFT --> PENDING_HR : Manager signs digitally
    PENDING_HR --> ISSUED : HR approves & co-signs
    PENDING_HR --> DRAFT : HR rejects (revision loop)

    ISSUED --> ANCHORED : Nightly blockchain batch
    ISSUED --> REVOKED : HR revokes (pre-anchor)
    ANCHORED --> REVOKED : HR revokes (post-anchor, also recorded on-chain)

    ISSUED --> EXPIRED : Auto-expire after 90 days
    ANCHORED --> EXPIRED : Auto-expire after 90 days

    REVOKED --> [*]
    EXPIRED --> [*]
```

| State | Meaning |
|---|---|
| **DRAFT** | Document created, manager is filling in content |
| **PENDING_HR** | Manager has signed; waiting for HR review |
| **ISSUED** | HR approved & co-signed; PDF generated; waiting for nightly anchor |
| **ANCHORED** | Hash recorded on Polygon blockchain; fully verifiable |
| **REVOKED** | Organization withdrew the document (with reason code) |
| **EXPIRED** | Auto-expired after 90 days (experience letters & salary proofs only; recommendation letters never expire) |

**Document Types (V1):**
- Experience / Relieving Letter (expires in 90 days)
- Salary Proof (expires in 90 days)
- Letter of Recommendation (permanent, never expires)

---

## 13. Verification -- The Six-Step Integrity Check

When a recruiter opens a shared link, CareerVault runs **six automated checks** in sequence:

```mermaid
flowchart LR
    A[1. Hash Check] --> B[2. Manager Signature]
    B --> C[3. HR Signature]
    C --> D[4. Merkle Proof]
    D --> E[5. On-Chain Anchor]
    E --> F[6. Revocation & Expiry]
    F --> G{All Pass?}
    G -->|Yes| H[VERIFIED]
    G -->|No| I[FAILED + Reason]
```

| Step | What It Checks | What a Failure Means |
|---|---|---|
| 1. **Hash Check** | Re-computes SHA-256 hash from document content + salt; compares to stored hash | Content has been tampered with |
| 2. **Manager Signature** | Verifies the manager's digital signature using the org's public key | Document wasn't signed by an authorized person |
| 3. **HR Signature** | Verifies HR's co-signature | HR never approved this document |
| 4. **Merkle Proof** | Recomputes the Merkle root from the document's proof path | Document wasn't part of the claimed batch |
| 5. **On-Chain Anchor** | Queries the Polygon smart contract to confirm the Merkle root exists | Blockchain record doesn't match |
| 6. **Revocation & Expiry** | Checks both database and on-chain revocation status; checks expiry date | Document has been withdrawn or has expired |

The recruiter sees a clear **Verification Report** with pass/fail for each step -- no technical knowledge required.

---

## 14. Revenue Model & Payment Flows

### Revenue Streams

| Stream | Who Pays | Price | How It Works |
|---|---|---|---|
| **Holder Premium** | Employees | $5/month | Unlimited shareable links (free-tier users pay per link) |
| **Per-Link Fee** | Free-tier employees | ~$2/link | One-time Stripe payment to generate a share link |
| **Verifier API** | Recruiters / BG-check firms | Tiered pricing | Paid API for bulk document verification |
| **Issuer-Verifier Discount** | Orgs that both issue & verify | 50% off | Incentivizes orgs to use both sides of the platform |
| **Org Subscriptions** | Companies | FREE / STARTER / ENTERPRISE | Tiered features and rate limits |

### Payment Architecture

- **Processor:** Stripe (subscriptions + one-time payments)
- **Webhooks:** All payment confirmations come via Stripe webhooks (not client-side) for reliability
- **Subscription lifecycle:** Managed entirely through Stripe -- creation, renewal, cancellation, and failed-payment handling

---

## 15. Security, Privacy & Compliance

### Cryptographic Security

| Layer | Mechanism |
|---|---|
| Document integrity | SHA-256 hash of canonicalized content (JCS/RFC 8785) + random salt |
| Digital signatures | RSA 2048-bit via AWS KMS (keys never leave AWS hardware security modules) |
| Dual-signature model | Every document requires both a manager signature and an HR co-signature |
| Blockchain anchoring | Merkle roots on Polygon -- publicly verifiable, immutable |
| Key rotation | Organizations can rotate KMS keys; old keys remain valid for previously signed documents |

### Privacy & GDPR

CareerVault implements **full GDPR Right to be Forgotten** compliance:

1. All PDFs deleted from cloud storage
2. All shareable links deactivated
3. **Salt removed from documents** -- this is the key mechanism: without the salt, the on-chain hash becomes a "dead hash" that can never be linked back to any person or content
4. All personal data (name, email, phone) replaced with anonymized placeholders
5. The deletion itself is logged for legal defensibility (7-year compliance retention)

**The blockchain hash remains** (it's immutable), but it becomes **cryptographically meaningless** without the salt -- satisfying GDPR requirements.

### Audit Trail

- **7-year retention** for critical events: document issuance, revocation, verification, blockchain anchoring, GDPR deletions, key rotations
- **90-day retention** for operational events: logins, profile updates, draft edits, link views
- Every action records: who did it, what changed (before/after snapshots), IP address, timestamp

### Organization Verification

Companies must **prove domain ownership** via DNS TXT record before they can issue any documents. This prevents impersonation -- only someone with admin access to `acme.com`'s DNS can register as Acme Corp on CareerVault.

---

## 16. Smart Contract (On-Chain)

The `AnchorRegistry` smart contract on Polygon is intentionally minimal:

| Function | What It Does |
|---|---|
| `anchorRoot(hash, count)` | Records a Merkle root hash and the number of documents it covers |
| `revokeDocument(hash)` | Marks a specific document hash as revoked on-chain |
| `verifyRoot(hash)` | Returns whether a Merkle root exists and when it was anchored |
| `isRevoked(hash)` | Returns whether a document hash has been revoked |

**Gas costs are negligible** (~$0.01 per daily anchor on Polygon PoS), regardless of how many documents are in the batch (thanks to Merkle trees -- 1,000 documents still produce a single 32-byte root hash).

The contract also supports batch operations (`batchAnchorRoots`, `batchRevokeDocuments`) for efficiency and emits events (`RootAnchored`, `DocumentRevoked`) for transparency.

---

## 17. Key Design Decisions

| Decision | What We Chose | Why |
|---|---|---|
| **Web 2.5, not full Web3** | SQL database + blockchain anchoring | Users don't need wallets or crypto knowledge; blockchain provides trust without the UX friction |
| **Custodial keys** | Platform manages signing keys via AWS KMS | Organizations don't manage their own keys; lowers onboarding barrier |
| **Merkle tree batching** | One blockchain transaction per day for all documents | Cost-efficient (~$0.01/day vs. $0.01 per document); same security guarantee |
| **Triple redundancy** | Polygon + IPFS + GitHub | If any two systems fail, proof can be reconstructed from the third |
| **Dual signatures** | Manager signs + HR co-signs | Two-person integrity; prevents any single individual from issuing fraudulent documents |
| **Salt-based GDPR** | Random salt mixed into hash; delete salt = dead hash | Achieves GDPR compliance without modifying the immutable blockchain |
| **No dispute mediation** | Organization has absolute authority over their documents | Simplifies the system; mirrors real-world employer authority |
| **Magic links for external managers** | 15-minute passwordless links | Professors writing recommendation letters don't need to create an account |
| **90-day document expiry** | Experience letters & salary proofs auto-expire | Encourages document freshness; recommendation letters are permanent |
| **English only (V1)** | Single language for launch | Simplifies content rendering and verification; multi-language is a V2 feature |

---

## Summary

CareerVault is a **career document verification platform** that combines the simplicity and performance of a traditional web application with the trust guarantees of blockchain technology. The architecture is designed to be:

- **Simple for users** -- no crypto wallets, no blockchain knowledge required
- **Trustworthy for verifiers** -- six-layer verification with on-chain proof
- **Compliant for enterprises** -- GDPR-ready with full audit trails
- **Cost-efficient to operate** -- one blockchain transaction per day, regardless of volume
- **Revenue-generating from day one** -- multiple monetization streams across all user types
