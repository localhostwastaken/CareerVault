# CareerVault Project Engineering Audit

**Audit date:** 13 November 2026 (Asia/Calcutta)  
**Repository revision:** 354ce1775e6ff242b52346464fa357bffd3f949c  
**Method:** source-led architectural and security review, repository-wide structural searches, targeted execution tracing, isolated tests, and primary-source standards comparison.  
**Disposition:** substantial functional prototype; not ready for a trusted production credential service.

## Executive summary

CareerVault is a React application backed by a NestJS modular monolith, PostgreSQL/pgvector, a separate Python inference service, encrypted object storage, and an optional Polygon Amoy anchoring adapter. Its strongest implemented work is the document pipeline: assigned-manager signing, a separate HR approval, role-bound RSA statements incorporating employee HMAC seals, encrypted content, and deterministic Merkle batching. Public verification recomputes checks against the server's stored record. The blockchain receipt is supplemental; it does not determine the verification verdict.

The implementation is materially narrower than its documentation. There is no current offline credential verifier, proof-file upload workflow, CSV bulk issuance module, real Stripe adapter, managed HSM adapter, or durable job queue. The actual document encoding is a custom versioned binary format, not JCS. LightGBM approximates manually weighted scores from synthetic data; TreeSHAP explains that approximation, not a model trained on real employment outcomes.

The immediate risks are identity and authorization, not missing features:

1. Registration does not establish email ownership before an account can receive organization privileges. An attacker can pre-register someone else's address and later inherit an invitation attached to that address.
2. Audit queries can disclose a shared user's activity across organizations; persisted recruiter profiles can retain access to an old organization when the user still has a recruiter role elsewhere.
3. Same-browser account switching retains RTK Query data from the previous account.
4. Some document transitions, refresh rotation, and magic-link consumption remain vulnerable to concurrent read-then-write races.
5. Issuance, erasure, AI extraction, and blockchain revocation have side effects that can be lost or race after the authoritative database transaction.

Encryption is real application-level envelope encryption. It is not HSM isolation and does not protect against a compromised application process. Field AAD lacks document/tenant identity; a database writer can transplant encrypted content into a readable record. Production templates also retain demo DNS and billing settings. Actual deployed overrides, live database controls, backups, and contract state were not verified.

**Recommended next increment:** establish verified identity and explicit tenant boundaries, close transition races, add regression coverage, then introduce a PostgreSQL-backed transactional outbox with bounded workers and reconciliation. Preserve the modular monolith. Defer broader feature development until these foundations are trustworthy.

**Checks executed:** backend unit suite: 386 passed, 3 failed, 389 total across 36 suites; selected Python tests: 9 passed. Frontend test execution and type-checking encountered missing local Vitest dependencies. No coverage percentage or production capacity is claimed.

## 1. Scope, evidence, and limitations

### 1.1 Audit boundaries

The initial tracked working tree was clean. Discovery identified 642 tracked files, 22 Prisma models, eight migration directories, 36 backend unit-test files, six backend integration-test files, four browser-spec files, five Python test files, one frontend unit-test file, and one Solidity test file.

Reviewed evidence includes application entry points, controller/service flows, guards and DTOs, cryptographic helpers and adapters, schema and migration DDL, AI code, frontend routing/state/API code, deployment manifests, test families, and documentation claims. Evidence references E01–E45 below identify files and relevant functions. Absence claims are bounded to this checked-out repository, based on tracked-file inventory and source searches; they do not assert that external systems or historical branches lack those capabilities.

No application code, configuration, dependency manifest, migration, database, or existing documentation was changed. The only intended repository addition is this report. No application server, production operation, migration, seed, browser integration suite, or deployment was started. Isolated backend tests used mocks and temporary test files; one test started a loopback RPC stub. Python was invoked with bytecode writing disabled and pytest cache disabled. Private environment files and key contents were not included in the report.

The report is not a certification, penetration-test attestation, legal compliance opinion, or performance guarantee. Static findings describe reachable source paths and their preconditions; they were not exploited against a deployed service.

### 1.2 Status vocabulary

| Status | Meaning in this report |
|---|---|
| IMPLEMENTED | A connected execution path exists in current code; runtime qualification is separately stated. |
| PARTIALLY IMPLEMENTED | A meaningful part works, but completion, recovery, integration, or required enforcement is missing. |
| DESIGNED | Schema, interface, or written architecture exists without the necessary executable path. |
| PLANNED | Explicit future intent only. |
| DEPRECATED | Superseded or historical approach referenced by documentation but absent from the current path; not necessarily a formal release deprecation. |
| NOT FOUND | No implementation or reliable explicit plan was located; this is not mislabeled as PLANNED. |

### 1.3 Unverified evidence

Missing evidence includes live Render/Vercel environment values, database TLS and RLS/grants, storage bucket policy, actual deployed bytecode/ownership, backup restore results, operational telemetry, recent CI execution, real billing events, labeled ranking datasets, model-quality reports, and production load measurements. Binary research papers, presentations, and screenshots are presentation artifacts, not proof that a feature executes.

## 2. Repository inventory

| Directory / component | Responsibility | Technology | Implementation status | Important files / evidence |
|---|---|---|---|---|
| Root | Backend build/start and hosting blueprint | Docker, shell, Render YAML | IMPLEMENTED configuration; production safety partial | Dockerfile, start.sh, render.yaml [E30] |
| client/src | Holder, manager, HR, admin, recruiter and public verification UI | React 19, TypeScript, Vite 7, Redux Toolkit Query, React Router, Tailwind | IMPLEMENTED core screens; pagination and session isolation incomplete | main.tsx, routes.tsx, store.ts, APISlice.ts [E27–E29] |
| server/src | Versioned HTTP API and scheduled work | NestJS 11, Express, TypeScript | IMPLEMENTED modular monolith | main.ts, app.module.ts [E01] |
| server/src/modules/auth | Password, magic link, JWT and refresh lifecycle | bcrypt, RS256 JWT, hashed opaque tokens | PARTIALLY IMPLEMENTED secure account lifecycle | auth.service.ts, tokens.service.ts, magic-link.service.ts [E02–E04] |
| organization, member, employee-key | Issuer onboarding, memberships, signer enrollment/reset | DNS TXT, Prisma, PBKDF2/HMAC | IMPLEMENTED paths; identity/tenant issues | organization.service.ts, member.service.ts, employee-key.service.ts [E05,E06,E12] |
| document, verification, share-link | Issuance, PDF, public checks and controlled disclosure | SHA-256, RSA, HMAC, pdf-lib | IMPLEMENTED core; recovery and portable proof incomplete | document.service.ts, verification-checks.ts, share-link.service.ts [E07–E09,E17,E18] |
| merkle and blockchain services | Batch hashes and submit/read anchor transactions | merkletreejs, ethers v6 | IMPLEMENTED; single-process coordination only | merkle.service.ts, polygon-anchor.service.ts [E14–E16] |
| server/prisma | Identity, workflow, billing and AI persistence | PostgreSQL, Prisma 7, pgvector | IMPLEMENTED 22-model schema, eight migrations | schema.prisma, migrations, prisma.config.ts [E10,E31] |
| server/src/prisma/encryption | Transparent encryption around selected model operations | Prisma query extension, AES-GCM | IMPLEMENTED with strict-mode option | field-encryption.extension.ts [E11] |
| key-management/storage services | RSA key custody, DEK wrapping, encrypted PDF persistence | Node crypto, filesystem or Supabase Storage | IMPLEMENTED software custody and real storage transports | local/supabase-kms.service.ts, encrypted-storage.service.ts [E13] |
| skill, recruiter | Consent-driven extraction, retrieval/ranking, outreach | HTTP AI client, SQL vectors | PARTIALLY IMPLEMENTED quality and lifecycle | skill.service.ts, talent.service.ts, recruiter.service.ts [E21–E23] |
| ai-service/app | Extraction, embeddings, heuristic ranking explanations | FastAPI, Groq HTTP, MiniLM, LightGBM | IMPLEMENTED inference scaffold; empirical ML unvalidated | main.py, extraction.py, embeddings.py, ranking.py [E24–E26] |
| payment, subscription, verifier-key | Demo checkout, entitlement, API keys and quotas | Mock processor, Prisma | PARTIALLY IMPLEMENTED product; real payments absent | payments.service.ts, payment.module.ts, api-key.guard.ts [E19,E20] |
| notification, audit, analytics, maintenance | In-app events, mail, reporting, retention and expiry | Prisma, Pino, Nest schedule | IMPLEMENTED paths; tenant audit scope and reliability partial | audit.service.ts, retention.cron.ts [E32–E34] |
| contracts | Root registry and revocation flags | Solidity 0.8.24, Hardhat | IMPLEMENTED contract and tests; deployment not independently checked | AnchorRegistry.sol, hardhat.config.ts, deployments/amoy.json [E16,E36] |
| server/test, server/src/**/*.spec.ts | Unit, crypto and API/DB regression checks | Jest, Supertest | IMPLEMENTED; current run has failures | package.json, test/jest-e2e.json [E35] |
| e2e | Browser lifecycle and RBAC regression checks | Playwright, Chromium, dedicated DB name | IMPLEMENTED harness; not run in audit | env.ts, playwright.config.ts, specs [E37] |
| documentation | Design, status, operations, API explanations | Markdown, images | PARTIALLY RELIABLE; material implementation drift | IMPLEMENTATION_STATUS.md, architecture.md, api.md [E38] |
| demo-guide, research-paper, root PPTX files | Demonstration and research material | HTML, images, Python, DOT, DOCX/PDF/PPTX | Presentation/experimental artifacts, outside runtime | research-paper/build/bench.mjs [E39] |

There are three application deployment units: static client, NestJS API (which also runs cron when enabled), and FastAPI. The contract is a separately deployed on-chain component, not a microservice. A worker-only Nest application entry point was not found: WORKER gates cron inside the same app. There is no root workspace manifest or shared published contract/SDK package. DTOs, UI types, Python schemas and the Solidity ABI are maintained separately.

### 2.1 Residue, duplication, and inconsistencies

- BulkIssuanceBatch is a schema-only design. No bulk issuance controller/service or UI route exists. csv-parse remains a dependency without a current source consumer. Old documentation calls this implemented. [E10,E38,E40]
- ioredis and REDIS_URL exist without a live Redis client; EventEmitterModule is initialized without located event publishers/listeners; Terminus is installed while health uses a direct SELECT 1. Treat these as removal candidates after dependency verification, not proof of queues or distributed limits. [E01,E40]
- LocalKmsService and SupabaseKmsService duplicate most cryptographic logic. Storage transport is the actual difference. A small shared cryptographic core would reduce divergence without a new framework. [E13]
- ipfsCid/githubCommitUrl, emailVerifiedAt, and the custom rootDid have no complete publication, verification, or resolution workflow. OrgTier has no connected organization-tier purchase lifecycle. [E10,E05]
- JCS, tools/verify-credential, credential-check UI, hash/file verification endpoints and bulk issuance are historical documentation residue. The current code explicitly replaces JCS with CVDOC v2. Their historical existence was not reconstructed from Git history. [E09,E17,E28,E38]
- Supabase Storage and Gmail SMTP are real implemented integrations, not mocks merely because some documents describe them that way. AWS KMS, S3, Stripe and SES driver names are accepted by configuration but their factories throw. [E13,E19,E30,E41]
- client/package-lock.json is ignored; client/public/vite.svg and client/src/assets/react.svg have no located application references. Empty page component directories contain .gitkeep files. Tracked research build __pycache__ files and a benchmark with another developer's absolute Linux paths are maintenance residue. These are not core production blockers. [E39,E40]
- ComingSoon is a fallback in route generation; current role navigation entries have implementations. It is not evidence that the main UI is a collection of placeholder screens. [E28]
- .claude files are developer tooling, not deployable product components. No AGENTS.md was found in the repository discovery.

## 3. Reconstructed architecture

### 3.1 System context

~~~mermaid
flowchart LR
    Holder[Holder] --> UI[CareerVault web UI]
    Staff[Organization admin / manager / HR] --> UI
    Recruiter[Recruiter] --> UI
    Visitor[Public verifier] --> UI
    Integrator[Verifier API consumer] --> API[NestJS API]
    UI --> API
    API --> DB[(PostgreSQL and pgvector)]
    API --> Objects[Local or Supabase encrypted storage]
    API --> AI[FastAPI]
    AI --> Groq[Groq extraction when configured]
    API --> DNS[DNS TXT or local bypass]
    API --> Mail[Gmail SMTP or console]
    API --> Chain[Polygon AnchorRegistry or local simulator]
~~~

Supported by [E01,E05,E13–E16,E24,E27,E30,E41]. No Stripe production service is drawn because no executable real adapter exists.

### 3.2 Container/component architecture

~~~mermaid
flowchart TB
    Web[React routes and role portals] --> RTK[RTK Query and memory-only access token]
    RTK --> Proxy[Vercel API rewrite in production]
    Proxy --> Guards[Nest JWT / role / throttle guards and validation]
    Guards --> Auth[Auth and membership modules]
    Guards --> Docs[Document / verification / share modules]
    Guards --> Recruit[Talent and recruiter modules]
    Guards --> Billing[Mock billing and verifier keys]
    Guards --> Reporting[Audit and analytics]
    Cron[WORKER-gated in-process schedules] --> Docs
    Cron --> Batch[Merkle batch service]
    Docs --> Prisma[Prisma encryption extension]
    Auth --> Prisma
    Recruit --> Prisma
    Billing --> Prisma
    Reporting --> Prisma
    Batch --> Prisma
    Prisma --> PG[(PostgreSQL)]
    Prisma --> Cipher[FieldCipher and software KMS]
    Docs --> PDF[pdf-lib and encrypted storage]
    Batch --> Chain[Blockchain adapter]
    Recruit --> Python[FastAPI HTTP endpoints]
~~~

Most request paths are synchronous HTTP/SQL. AI extraction after issuance, email dispatch from NotificationService, and revocation transactions are unawaited in-process promises. Cron is asynchronous in the scheduling sense but has no durable queue or persisted job lease. Manual anchoring waits on RPC and database work in the request. [E07,E14,E19,E21,E30,E34]

### 3.3 Architectural judgment

The modular monolith is appropriate. Nest dependency injection and adapter interfaces isolate infrastructure reasonably well; no need for separate services per domain. The Python boundary has a defensible runtime reason. PostgreSQL holds authoritative state while the chain stores commitments, avoiding personal information on-chain.

The weak boundary is between a committed business event and external effects. Modules frequently perform the database update, then storage/network/notification work, without an outbox or recovery state. Another weak boundary is tenant context: some services accept an organization explicitly, some pick the first membership, and recruiter identity is globally unique per user. Splitting these into microservices would amplify the problems. [E05–E07,E14,E19,E22,E32]

## 4. Critical execution flows

| Workflow | Entry and service path | Persistence / integrations | Error handling and final state |
|---|---|---|---|
| Registration / password login | POST /auth/register or /login → AuthService → TokensService | User, bcrypt cost 12, RS256 access token, hashed refresh token | Registration creates a usable account/session before email ownership; conflict on existing email. Login checks active user. Demo password path is explicitly configurable. [E02] |
| Refresh / logout / recovery | POST /auth/refresh, /logout, /forgot-password, /reset-password | RefreshToken rotation; MagicLink purpose and expiry; mail | Refresh and magic consume are non-atomic; password change revokes refresh tokens, not existing access JWTs. JWT strategy reloads active memberships every request. [E03,E04] |
| Organization onboarding | POST /orgs → create; POST /orgs/:id/verify-domain → verifyDomain | Nested founder membership, DNS token, RSA key creation, org public key | Email-domain equality uses unverified registered email. Real TXT adapter exists; local adapter always succeeds. Key provisioning and DB verification update are not one atomic resource operation. [E05,E41] |
| Membership invitation | POST /orgs/:id/members → MemberService.add | Find/create user by email; activate role immediately; magic-link/generic email | No invitation acceptance or ownership check for an existing password account. Email failures are caught after the membership commits. [E06] |
| Request / draft | POST /documents/request or PUT /documents/:id → DocumentService | Verified org, assigned manager, Document, DocumentVersion | Request requires a verified organization. Draft update authorizes holder or any manager in that org; not necessarily assigned manager. Status read is not repeated in update predicate. [E07] |
| Manager signing | POST /documents/:id/sign → unlock → validate subject → sealAndSign | EmployeeKey, org RSA, salted document hash; guarded update to PENDING_HR plus version | Requires assigned active manager and correct step-up secrets; signs normalized authoritative fields. Competing sign fails conditional update. Audit/notifications occur after commit. [E07,E09,E12] |
| HR approval / issuance | POST /documents/:id/approve → approve → PDF service | HR must differ from manager; hash rebuilt; HR seal/RSA; guarded ISSUED update; encrypted PDF put | Checks manager signature presence and content hash, but does not cryptographically verify manager signature before issue. PDF failure occurs after ISSUED commits; retry conflicts. Skills start only after PDF/notification path reaches its trigger. [E07,E08,E17] |
| Upload and processing | No current issuance upload endpoint | Structured DTO subjects, not arbitrary uploaded PDFs | No located multipart/OCR/virus-scan pipeline. PDF is generated from fields. No file verification route; public verification accepts ID/token. [E07,E08,E17,E28] |
| Public verification | GET /verify/document/:documentId or GET /verify/:token → VerificationService → runChecks | Decrypt fields; rebuild hash; open employee keys; check HMAC and RSA; status/expiry; optional Merkle/RPC; audit row | Core checks yield VERIFIED/INVALID/REVOKED/EXPIRED. Chain outage changes badge only. A valid ID verifies the stored record, not the bytes of a PDF shown by a third party. [E17] |
| Share / bulk verify | POST /share-links; GET /verify/:token; POST /verify/bulk | Owner check; premium or mock-paid activation; atomic view claim; X-API-Key tier/quota | Token is a disclosure capability. Bulk supports up to 100 document IDs with per-item error results. It is bulk verification, not bulk issuance. [E18,E20] |
| Blockchain anchoring | Midnight IST cron or POST /merkle/run → runBatch | Select unanchored ISSUED rows; hash gate; SHA-256 tree; RPC submit; transaction creates root/proofs/status | Same-process mutex; exact-root reuse recovery. No durable pre-submission batch/transaction record. New candidates or another worker can change retry batch identity. [E14–E16] |
| AI matching | Issuance/manual extraction → SkillService; opening create/search → RecruiterService/TalentService | Allowlisted text to /extract, /embed; vector SQL; /rank; TalentMatch upserts | Optional extraction failure logs; no durable retry. Opening commits before embedding, so AI failure leaves an unusable opening. Search filters discoverability/org but not active credential status/expiry. [E21–E26] |
| Revocation / expiry | POST /documents/:id/revoke; RetentionCron | Atomic status+link deactivation; separate chain write; expiry updateMany | DB revocation is immediate; chain failure is only logged. Verification computes expiry without cron, but sharing creation checks stored status only. [E07,E17,E18,E34] |
| Account erasure | DELETE /users/me → UserService.deleteAccount | Transaction tombstones user, scrubs document/version content/salt, revokes keys/links, deletes selected derived rows; PDF deletes after commit | Failed storage deletion needs manual cleanup. Other users' notifications, audit free text, magic links and recruiter-side records are not comprehensively scrubbed. In-flight extraction/PDF work is not fenced. [E33] |
| Subscription and billing | POST subscribe → mock checkout → authenticated mock complete → fulfill | Pending Payment → conditional completed flip; subscription/link activation in transaction | Working simulation and entitlement enforcement; real Stripe factory unavailable. No recurring invoice/refund/dispute implementation. [E19,E20] |

### 4.1 Document issuance sequence

~~~mermaid
sequenceDiagram
    participant H as Holder
    participant API as DocumentService
    participant DB as PostgreSQL
    participant M as Assigned manager
    participant K as EmployeeKeyService / software KMS
    participant HR as Different HR user
    participant S as Encrypted PDF storage
    participant AI as AI service
    H->>API: Request document
    API->>DB: Create REQUESTED with manager
    M->>API: Sign subject and step-up answers
    API->>K: Derive/compare key; HMAC; org RSA
    API->>DB: Conditional PENDING_HR + version
    HR->>API: Approve with own step-up
    API->>K: HR HMAC and role-bound RSA
    API->>DB: Conditional ISSUED + version
    API->>S: Render, encrypt and store PDF
    Note over DB,S: Database already committed; storage failure is not rolled back
    API-->>AI: Optional unawaited extraction
    API-->>HR: Presented issued document
~~~

### 4.2 Document verification sequence

~~~mermaid
sequenceDiagram
    participant V as Verifier
    participant API as VerificationService
    participant DB as Encrypted Prisma / PostgreSQL
    participant K as Software KMS
    participant C as Blockchain adapter
    V->>API: Document UUID or share token
    API->>DB: Read record and related signing keys/proof
    opt Share token
        API->>DB: Conditional view increment
    end
    API->>K: Unwrap field DEKs and employee keys
    API->>API: Rebuild bytes, hash, HMACs, RSA checks, status/expiry
    API->>API: Fold Merkle proof if present
    API->>C: Read current adapter's root existence
    Note over API,C: Chain affects badge only
    API->>DB: Best-effort verification audit
    API-->>V: Sanitized verdict and disclosure fields
~~~

### 4.3 Encryption and key management

~~~mermaid
flowchart LR
    Master[Environment master key or dev key file] --> HKDF[HKDF field KEK]
    Master --> OrgWrap[AES-GCM wrapped organization RSA private key]
    Master --> EmployeeKEK[HKDF employee KEK by organization]
    Answers[DOB / identifier / answers plus salt] --> KDF[PBKDF2 SHA-256 600000]
    KDF --> EmployeeKey[Employee HMAC key]
    EmployeeKey --> EW[AES-GCM employee wrapping with user/org/version AAD]
    EmployeeKEK --> EW
    HKDF --> DW[AES-GCM wrapped random DEK]
    DW --> Envelope[Field envelope with fresh 12-byte IV]
    Label[Field-name AAD] --> Envelope
    Envelope --> DB[(Selected document/version columns)]
    HKDF --> FileEnv[Encrypted file envelope with storage-key label]
    FileEnv --> Store[Local or Supabase objects]
    OrgWrap --> Store
~~~

Employee wrapping has user/org/version AAD; ordinary field encryption has field-name-only AAD. The root master key and plaintext keys are available to the application process. [E11–E13]

### 4.4 Blockchain anchoring

~~~mermaid
flowchart LR
    Trigger[Cron or authorized manual run] --> Select[Unbounded candidate selection]
    Select --> Gate[Decrypt fields and recompute document hash]
    Gate --> Tree[SHA-256 leaves and sorted pairs]
    Tree --> Read[verifyRoot]
    Read -->|Absent| Send[Serialized in-process wallet send]
    Read -->|Present| Recover[Recover receipt or event if possible]
    Send --> Confirm[Poll receipt and confirmations]
    Confirm --> Persist[DB transaction: root, proofs, guarded statuses]
    Recover --> Persist
    Persist --> Effects[Best-effort PDF metadata and notification]
~~~

The gate does not verify the manager/HR signatures. Merkle membership proves commitment inclusion, not issuer honesty or document truth. [E14–E16]

### 4.5 AI inference pipeline

~~~mermaid
flowchart TB
    Doc[Consented issued structured document] --> Allow[Skill text allowlist]
    Allow --> Extract[Groq JSON extraction or vocabulary heuristic]
    Extract --> Skills[(ExtractedSkill row)]
    Extract --> Embed[MiniLM or hashing fallback]
    Embed --> Vec[(384-dimensional vector)]
    Job[Job opening text] --> Embed
    Vec --> Retrieve[Distinct holder cosine retrieval, top 10]
    Skills --> Retrieve
    Retrieve --> Features[Six engineered features]
    Features --> Rank[LightGBM synthetic-weight approximation or weighted sum]
    Rank --> Explain[TreeSHAP or direct weighted contributions]
    Explain --> Match[(TalentMatch score and explanation)]
    Match --> UI[Recruiter match panel]
~~~

### 4.6 Database interaction flow

~~~mermaid
flowchart LR
    Guard[JWT loads user and active memberships] --> Service[Domain service authorization]
    Service --> Model[Prisma model operations]
    Model --> Extension[Seal writes / open reads / forbid unsupported nested encrypted writes]
    Extension --> DB[(Shared PostgreSQL schema)]
    Extension --> Cipher[FieldCipher]
    Service --> SQL[Parameterized raw pgvector SQL]
    SQL --> DB
    Service --> Tx[Transactions for selected state changes]
    Tx --> Extension
    DB --> Audit[Application-managed AuditLog]
~~~

There is no repository-defined tenant RLS. Raw SQL bypasses field-encryption model hooks by design; current vector SQL targets plaintext derived fields. Audit is ordinary mutable relational data. [E10,E11,E22,E32]

## 5. Prioritized findings register

Severity describes engineering/security impact; priority describes delivery order. Static confidence is high where the predicate or missing call is visible. Runtime/environment claims are explicitly qualified.

### F01 — Email ownership is not an authorization prerequisite
**Critical impact, P0; source-confirmed path.**

AuthService.register creates an active password account and returns tokens without verification. MemberService.add finds existing users by address and activates membership immediately. Existing password accounts receive a notification, not an acceptance challenge. An attacker who registers a target employee address before invitation can retain that account and receive a later manager/HR/admin grant. They can enroll their own signing answers. OrganizationService.create also treats an asserted email domain as affiliation, enabling domain reservation without mailbox proof. Real DNS protects final issuer verification but does not fix invitation identity. [E02: register/buildResult; E06: add; E05: create]

**Fix:** verified email ownership before accepting privileged membership; single-use invitations bound to intended address/org/role and accepted by a verified identity; safe handling of previously registered unverified accounts. Test pre-registration, re-invitation and address normalization.

### F02 — Audit visibility crosses tenant boundaries
**High, P0; source-confirmed predicate.**

AuditService.list chooses the first administered organization, then includes every audit event whose actorId belongs to any member of that organization. A person shared by organizations A and B makes their B events visible to A's administrator, including newValue payloads and entity identifiers. There is no organizationId on AuditLog. If both scope arrays are empty, the constructed filter becomes unscoped; this is a defensive concern because normal admin membership makes that condition unlikely. [E32: AuditService.list]

**Fix:** explicit trusted organization scope on every tenant event, validated organization context on reads, and an always-deny empty scope. Separate user-global security events from organization audit visibility. Backfill deliberately rather than infer tenancy solely from current memberships.

### F03 — Recruiter tenancy and related-object authorization are incomplete
**High, P0; source-confirmed paths, multi-organization precondition.**

RecruiterService.ensureProfile returns an existing profile without checking its isActive flag or an active RECRUITER membership in its organization. Controller guards check role presence anywhere. A recruiter removed from organization A but still a recruiter in B can continue using A's persisted profile/openings. The globally unique userId also prevents independent recruiter profiles for multiple organizations.

MessageService.send verifies that a holder has some match for the recruiter's openings, but accepts dto.jobOpeningId without checking ownership or that particular match. With another opening's UUID, the created message can reference that opening; listSent/listReceived join and reveal its title. A UUID's unpredictability is not object authorization. [E22: ensureProfile/getOwnedOpening; E23: send/listSent; E04: RolesGuard]

**Fix:** explicit org context and membership revalidation; composite profile identity; require supplied opening ownership and holder match for that opening. Add removal-and-switching and foreign-opening tests.

### F04 — Cached frontend data survives account changes
**High confidentiality risk, P0; source-confirmed cache lifecycle gap.**

useSignOut clears authSlice but not APISlice. Login/logout invalidate only Auth tags. Document, notification, skill, member and match queries commonly have arguments without a user identity. A second account signing in within the same running browser application can reuse the first account's cache until eviction/refetch; even a later failed request may leave old data available. The API's authorization does not sanitize already-cached browser data. [E27: APISlice/store; E29: auth hooks/authApi/authSlice]

**Fix:** reset all authenticated API state on logout, erasure and identity change; abort obsolete requests; include appropriate organization context in query keys. Verify account A → logout → B without a reload, including offline and slow-request cases.

### F05 — Production trust gates are warnings, and deployment defaults include bypasses
**Critical if used for trusted issuance, P0; configuration confirmed, live values unknown.**

render.yaml selects DNS_DRIVER=local and PAYMENT_DRIVER=mock, with console email as the declared default. LocalDnsService returns true for every domain. Combined with F01, a user can assert an email/domain, create an issuer and obtain its key without proving control of that domain. AuthService contains a known fixed demo password path that works in production if its opt-in flag is enabled; the flag defaults false. Warnings do not prevent this from being a trusted production deployment. Console mail prints authentication links. No actual deployed flag values were read. [E02,E30,E41]

**Fix:** distinct demo/trusted deployment profiles; fail startup for identity bypasses and demo master login in trusted production. Disable paid entitlements or label demo billing until real collection is implemented. Do not merely select stripe: its adapter currently throws.

### F06 — Incomplete compare-and-set transitions can overwrite signed state
**High, P0/P1; source-confirmed concurrency gap.**

sign, approve, reject and revoke condition the write on status. updateDraft, resubmitRequest, returnByManager and delete check status before an unconditional ID-only mutation. A delayed draft update can run after signing and set the row back to DRAFT; resubmission can change signed identity/content after the initial read; a deletion begun on a draft can remove a now-signed document. sign itself guards status but not the original version or assigned-manager snapshot, so a concurrent draft/reassignment can be lost. [E07: updateDraft 113, sign 149, resubmitRequest 523, delete 591, returnByManager 604]

**Fix:** enforce allowed status, expected version and relevant assignment/ownership predicates in the transaction; use an explicit transition model and consistent conflict responses. Keep external side effects outside retries. Add actual PostgreSQL concurrency tests.

### F07 — Token single-use semantics are not atomic
**High, P1; source-confirmed concurrency gap.**

MagicLinkService.verifyAndConsume reads unused state then updates usedAt by ID; two requests can consume the same token. TokensService.rotateRecord revokes then creates the successor without a transaction or conditional claim. Concurrent rotation can mint multiple live successors or leave a revoked token without a replacement on failure. The grace path selects the newest live token for the user, not a recorded successor/family, so unrelated sessions can be mixed. [E03: rotate/rotateRecord; E04: verifyAndConsume]

**Fix:** atomic token claims with expiry/purpose conditions, explicit refresh family/successor records and transactional rotation; deterministic, bounded grace semantics. Access-token revocation policy also needs an explicit decision: current JWTs survive password change/logout until expiry (default one day, Render template 15 minutes).

### F08 — Committed issuance can return failure and remain unfinished
**High reliability risk, P1; source-confirmed ordering.**

approve commits ISSUED before generateAndStore. A font/render/storage failure leaves an issued document without a PDF, returns an error and prevents retry through approve because the status is no longer PENDING_HR. Notification creation can similarly fail after the business commit. AI extraction and chain revocation are unawaited promises without durable retry. [E07: approve/revoke; E08; E34: notify]

**Fix:** transactionally record required work, use idempotent workers and visible processing states; provide repair/reconciliation for missing PDFs, failed extraction, notifications and unsynchronized revocations. The user should receive the committed business outcome with explicit pending work.

### F09 — Field encryption does not bind ciphertext to its record or tenant
**High under database-write compromise, P1; source-confirmed construction.**

FieldCipher AAD is based on field name and version only. The Prisma extension decrypts selected content before DocumentService.getById presents it. A database writer can copy another document's contentJson envelope into a document they can read; strict mode accepts the valid envelope and the authenticated detail endpoint discloses the plaintext. Hash/signature checks can reject that transplanted document on verification, but detail reads do not run those checks. [E11: openResult; E13: FieldCipher.aadFor; E07: getById/toPublic]

Employee-key wrapping is better scoped: it binds user, organization and key version. File encryption binds storage key. Neither ordinary field encryption nor these mechanisms prevent same-record rollback by a database writer. Status, expiry, public keys and memberships remain mutable plaintext. [E12,E13]

**Fix:** versioned envelopes with model/tenant/record/field AAD, reviewed migration and replay tests. Separately address authorization-data integrity and historical issuer-key trust; encryption alone is not a defense against every database writer.

### F10 — Key custody and step-up guarantees are weaker than independent co-signing
**High trust limitation, P1; intentional architecture with missing controls.**

Both RSA signatures use one organization key, and employee HMAC keys are recoverable by the same backend. Two users perform different actions, but the server can generate both proofs. DOB/identifier/security answers are knowledge factors; the public salt does not add secret entropy. PBKDF2 raises guessing cost but cannot turn known personal data into a strong independent authenticator. No managed KMS/HSM adapter or master-key rotation/keyring exists. Loss/change of the master key can make data and historical HMAC verification unavailable. [E09,E12,E13]

**Fix:** first implement stronger step-up and audited recovery, then managed key custody where operational requirements justify it. Preserve honest terminology: custodial organization attestation with employee step-up, not independently controlled personal signatures. OWASP treats security questions as a legacy pattern and repeated knowledge factors as distinct from MFA. [Security questions](https://cheatsheetseries.owasp.org/cheatsheets/Choosing_and_Using_Security_Questions_Cheat_Sheet.html), [MFA guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html).

### F11 — Erasure is substantial but not comprehensive or durably completed
**High privacy/reliability risk, P1; source-confirmed omissions and race windows.**

UserService scrubs all holder document/version contents and salts in a transaction and revokes sessions/API keys/share links. However, revocationReasonText is retained; audit old/new values and notifications belonging to other users can still contain names or reasons. MagicLink.email rows are not erased by the transaction. RecruiterProfile, its openings/sent messages, and billing records remain; retention requirements for those categories need an explicit policy. PDF deletion failures are logged for manual removal. [E33]

A concurrent extraction reads consent/content before erasure, waits for AI, then upserts derived data after the erasure transaction. Approval can likewise render/store from a pre-erasure snapshot after cleanup. RetentionCron deletes STANDARD logs at 90 days but never implements the documented seven-year COMPLIANCE purge. Deleting a salt from the live row does not destroy copies in backups or files previously disclosed to others. [E21,E07,E34]

**Fix:** data inventory and policy per record category; erasure fence/version checked by every worker; durable deletion jobs and completion ledger; backup retention/restore handling. Do not claim GDPR compliance solely from the salt-deletion mechanism.

### F12 — Anchoring is not safely coordinated across replicas or crash boundaries
**High reliability risk, P1 before scale-out; source-confirmed.**

The mutex and wallet write queue are process-local. Overlapping organization-scoped and global batches can submit different roots covering the same documents. Proof uniqueness rejects a later DB transaction but cannot undo an already-paid chain transaction. A crash after submit and before DB commit loses the submitted transaction list; exact-root/event recovery helps only when the subsequent selected set is identical and event lookup is available. New documents can change that root. [E14,E15]

Positive root cache entries have no finality invalidation; reorganization recovery is absent. anchorBadge verifies against the currently configured adapter, not the stored chainId/contractAddress, while displaying stored provenance. Historical verification can misreport after an adapter/registry change. Revocation is not reconciled and its on-chain flag is not part of the public verdict. [E15,E17]

**Fix:** durable batch membership and transaction lifecycle, single wallet writer lease, reconciliation by persisted tx/root, explicit confirmation/finality policy, and adapter resolution from stored provenance. Keep the simple contract.

### F13 — Talent search can use stale or ineligible evidence
**High product integrity risk, P1; source-confirmed filters.**

Initial extraction checks status and consent. Later candidate SQL filters discoverability and org scope but does not require current ISSUED/ANCHORED state, unexpired status, enabled consent or active/non-erased user state. Revocation does not remove derived skill rows. skillsByHolder similarly aggregates old skills without lifecycle filtering. Recency is extraction time, so manually re-extracting old credentials makes them appear fresh. Existing matches are upserted but obsolete matches are not cleared on a new search. [E21,E22]

**Fix:** a shared evidence-eligibility predicate at extraction, retrieval, match read and outreach; retain source document IDs and immutable evidence timestamp; invalidate/reconcile derived profiles on revocation, expiry and erasure.

### F14 — Embedding fallback can silently mix incompatible vector spaces
**High relevance/reproducibility risk, P1; source-confirmed representation gap.**

MiniLM and token-hashing both produce 384 numbers but those coordinates have different meanings. The /embed response supplies only the vector; storage has no embedding-space identifier for either skills or openings. A degraded deployment can write hashing vectors alongside MiniLM vectors, and later cosine comparisons still execute. nlpModelVersion is the constant ai-service/extract, not extraction/provider/embedding provenance. [E21,E24,E26]

**Fix:** persist embedding model/revision, dimension, preprocessing and fallback identifier; prohibit cross-space comparison; quarantine/rebuild fallback vectors. Make degraded mode visible and test it.

### F15 — Ranking explanations are mathematically meaningful but empirically unvalidated
**Medium, P1 for honest presentation / P2 for training; source-confirmed.**

_fit_booster fits 2,000 uniformly random six-feature rows with labels from fixed weights plus noise. There is no outcome dataset, split, ranking metric, fairness analysis or calibration report. Native pred_contrib explains that booster; weighted fallback contributions are direct weighted terms with zero baseline, not evidence that a tree was used. The API has honest version names, but persisted TalentMatch explanations omit model_version and the UI displays generic LightGBM/TreeSHAP language. [E25,E22,E29]

**Fix:** retain the transparent baseline, publish provenance, test contribution reconciliation against direct predictions on the booster path, collect appropriately consented labels and compare models on time/group-separated held-out data. Holder INTERESTED/NOT_INTERESTED responses are noisy interest labels, not proof of qualification or hiring success.

### F16 — PDFs truncate content and are not file authenticity proofs
**High product risk, P1; source-confirmed rendering/control flow.**

generateAndStore adds one page and breaks when y reaches BOTTOM_GUARD. Longer fields/later sections are silently omitted. The PDF contains an ID and verification URL; it has no cryptographic binding of the PDF bytes to the server's verification response. A forged PDF bearing a genuine ID can lead to a valid stored-record verdict. Users must compare the disclosed record, which may omit private fields. [E08,E17,E28]

**Fix:** multipage layout with full-content tests and truthful verification language. For portable verification, define a signed canonical export/proof bundle and optionally bind an immutable rendered artifact. A QR link improves usability but does not solve content binding.

### F17 — List handling is inconsistent and loses pagination
**Medium, P1; source-confirmed.**

The server's document list is paginated, but APISlice unwraps only data and drops meta. listDocuments asks for 100 and returns an array; local filters/counts cannot see older documents. Notifications similarly discard metadata; many member/share/opening/message lists are unbounded. Audit listing first loads all org document/member IDs and constructs large IN predicates. [E07,E18,E22,E23,E27,E32]

**Fix:** preserve typed pagination envelopes, include org context, use server filtering and deterministic tie-breakers, and replace audit preloading with indexed relational tenant filtering. Cursor pagination is appropriate for growing histories, not mandatory for every small picker.

### F18 — API quota and logging protections have gaps
**High credential-log risk; medium quota risk, P1; source-confirmed configuration.**

Pino redacts Authorization, Cookie and Set-Cookie but not X-API-Key. Request URLs can contain share capability tokens. Generic 5xx logging includes raw error detail and req.url. Console mail intentionally logs login links. Validate actual serialized output before operating with real credentials. [E01,E20,E41]

Monthly quota enforcement reads a count then increments/resets without an atomic cap predicate. Concurrent calls can pass the cap and a reset race can undercount. Limits are per key while users can create multiple keys; decide whether plan quotas are per key or per subscriber. The global 100/minute IP limiter can also constrain the advertised ENTERPRISE 1,000/minute key allowance. [E20]

**Fix:** redact secret headers and capability paths, test logs, enforce transactional per-policy quotas, and coordinate rate limits before multiple replicas. Validation failures currently spend quota because guards execute before DTO pipes; document or change that billing rule.

### F19 — Persistence invariants rely too heavily on service conventions
**Medium/high, P1; source-confirmed schema.**

No composite constraint binds a document's manager/approver membership to its organization. No unique active employee-key or active subscription invariant exists. Two different subscription fulfillments can create concurrent active plans despite each payment being idempotent. Last-admin deactivation/erasure checks count before writing, so concurrent operations can orphan an org. DocumentVersion duplicates version numbers during approval by design of the current code; adding uniqueness without correcting semantics would break it. [E06,E07,E10,E12,E19,E33]

**Fix:** define intended invariants first, then compatible constraints, conditional writes and transactions. Keep audit events distinct from content revision numbers.

### F20 — Production verification and operations are not reproducible enough
**High release risk, P1; repository and executed checks.**

No checked-in CI workflow or enforced quality gate was found. Frontend lockfile is ignored. Backend runtime image installs prisma@7 after npm ci, allowing toolchain drift from the lockfile; image runs as root and starts migrations in every replica's startup. AI dependencies are directly pinned, but transitive packages/model revisions are not fully locked and ranker artifact is trained at runtime. No restore drill, release rollback evidence or SLO alerts were found. [E30,E35–E40]

The current checkout has a stale generated Prisma client (missing manager/hr seal fields), missing Vitest installation, and Windows-specific test assumptions. These are observed local setup limitations, not evidence that every clean build fails. Docker does explicitly generate Prisma before building. [E35]

### F21 — Legacy documents lack an explicit cryptographic migration path
**High upgrade risk, P1; source-confirmed compatibility gap.**

The employee-key migration adds nullable seal/key columns; runChecks requires both employee keys and seals. The serializer is now CVDOC v2, but Document has no persisted crypto-format version and the migrations do not reissue or upgrade legacy JCS/old-signature records. Existing old credentials can therefore fail current verification after upgrade. There is no evidence that a production dataset was migrated or safely reissued. [E09,E10,E17,E31]

**Fix:** explicit algorithm/format version per issuance; verifier dispatch for supported historical versions; controlled reissuance for cases that cannot be securely migrated. Never fabricate a historical employee approval during backfill.

## 6. Backend engineering and scalability

| Area | Assessment | Evidence and consequence |
|---|---|---|
| API design | Versioned domain-oriented API with explicit actions | /api/v1, DTO whitelist/forbidNonWhitelisted, UUID pipes, common success/error mapping; reasonable 400/401/403/404/409/422 handling. Some endpoints return 200 on create, a consistency issue rather than a blocker. [E01,E07,E17] |
| Validation | Good subject validation; uneven boundary constraints | Per-type document subject DTOs and normalization are substantive. Several basic auth/org strings lack maximum lengths; AI response shapes are TypeScript casts rather than runtime validation. [E07,E21,E24,E26] |
| Separation | Sensible Nest modules and adapters | DocumentService is over 1,000 lines and coordinates state, crypto, PDF, notifications and AI. Extract cohesive helpers only when they clarify invariants; no generic repository layer is needed merely to wrap Prisma. [E07] |
| Transactions | Strong in selected critical writes | Sign/approve conditional updates; revoke and links together; payment fulfillment flip; erasure transaction. Inconsistent elsewhere, especially F06/F07/F19. |
| Idempotency | Partial | Payment completion and exact-root anchor checks are guarded. Request/checkout/opening creation has no client idempotency key; external failures can strand entities. [E07,E14,E19,E22] |
| Timeouts/retry | Explicit AI and RPC deadlines | AI defaults to 90 seconds; RPC request timeout 10 seconds; confirmation polling defaults 120 seconds; SMTP timeouts configured. No general durable backoff/dead-letter/replay control. [E15,E24,E41] |
| Query efficiency | Good targeted includes; known expensive paths | Document presentation avoids one query per displayed party; list and count are separate reads. Merkle integrityGate performs one query per candidate in unbounded Promise.all. Audit preloads IDs; talent DISTINCT ON scans/sorts the filtered candidate set. [E07,E14,E22,E32] |
| CPU/memory | Potential single-node pressure | RSA generation is synchronous; per-sign PBKDF2 uses async libuv work; PDF/font rendering and full buffers consume CPU/memory; all-batch tree and proof writes are unbounded. [E08,E12–E15] |
| Caching | Some useful local caches, incomplete isolation/finality | Field DEK cache capped at 1,000; blockchain caches capped at 10,000 with positive-root permanence; frontend identity cache missing reset. [E13,E15,E27] |
| Background reliability | Prototype level | Schedules and unawaited promises; no distributed lease or durable delivery. [E14,E21,E34] |

### 6.1 Capacity assessment — no measured production capacity

| Target | What the implementation supports conceptually | Current bottleneck / required evidence |
|---|---|---|
| 1,000 concurrent users | Stateless HTTP plus pooled PostgreSQL can be scaled in principle | No load test. Auth membership DB read per protected request; 30-second notification polling alone is about 33 requests/second for 1,000 open portals, before other activity. Crypto, PDF, DB pool and AI must be measured. [E04,E29] |
| 10,000 registered users | Relational identity model and email uniqueness are suitable | Registration/session security, list bounds and tenant semantics must be fixed; user count alone is not a throughput measure. |
| 100,000 documents | PostgreSQL and normalized proofs can store this scale in principle | Unbounded anchor batch selection/gate fan-out, per-document writes inside one transaction, decrypting list payloads, audit IN lists, and 100-document UI cap. |
| Growing verification traffic | Public endpoint, bulk limit and some root caching exist | Each lookup decrypts fields, opens signer keys, verifies signatures and writes an audit row; RPC can add latency. Needs bounded concurrency, rate policy, latency/error metrics and status-cache correctness. |
| Multiple organizations | Memberships and document org keys exist | F02/F03 and first-membership context selection prevent trustworthy multi-tenant rollout. |
| Large uploads | No general upload workflow exists | Cannot claim support. JSON request bounds and generated PDFs are not upload scalability evidence. |

Existing research microbenchmarks measure an older JCS path using hardcoded local imports. They exclude HTTP, encryption extension, storage, DB, AI, concurrent writes and network behavior; they cannot establish these targets. [E39]

## 7. Database and data architecture

### 7.1 Relationships and integrity

The central aggregate is Document: holder User, Organization, optional signer/approver memberships, pinned EmployeeKeys, content revisions, one Merkle proof, many share links and one extracted skill record. OrganizationMember supports multiple roles through uniqueness on userId/organizationId/role. MerkleRoot owns proofs; subscription/payment and verifier credentials attach to User; recruiter profiles own openings, matches and messages. [E10]

Useful controls include foreign keys, restrictive holder/org deletion for documents, cascading child cleanup, unique token hashes, unique document proof, unique job/holder match, and unique root/transaction hashes. UUID identifiers and parameterized raw SQL reduce injection exposure; they do not enforce tenant isolation.

Missing cross-entity invariants include membership organization matching a document, recruiter opening matching its profile's organization, and message opening ownership. There are no migration-defined RLS policies, CHECK constraints for numeric counters/ranges, or explicit partial unique indexes for one active employee key/subscription. Deployment-side RLS/grants were not inspected. [E10,E31]

### 7.2 Index review

| Query / index | Assessment | Recommendation |
|---|---|---|
| Documents holder/status/createdAt, org/status, signer ID | Useful for principal queues | Confirm actual plans for status-optional listings; add createdAt/id ordering support only with measured evidence. |
| OrganizationMember userId and unique userId/orgId/role | Standalone userId index may overlap unique-index prefix | Check index usage and size before dropping. |
| OrganizationMember orgId/role | Useful role targeting | Consider isActive selectivity and sort only after EXPLAIN on realistic data. |
| Audit actorId, action, retention/createdAt | Individual indexes exist; step-up counts and org histories combine predicates | Candidate composite actor/action/createdAt index; organization/createdAt after adding explicit tenant scope. |
| Subscriptions user/status | Supports entitlement reads | Add invariant for active plans according to product rule; consider expiry partial index for cron at real volume. |
| Magic/refresh expiry cleanup | Expiry columns lack targeted expiry indexes | Evaluate expiry/revocation maintenance plans before large token volumes. |
| extracted_skills HNSW | Exists but current DISTINCT ON holder query does not use the simple ANN ordering path | Consider one eligible profile vector per holder/org/model only after relevance and latency baseline. |
| recruiter_job_openings HNSW | Current queries load openings by ID, not ANN | Speculative write/storage cost; remove or defer unless a measured reverse-search workflow needs it. |
| DocumentVersion documentId only | Efficient history lookup but no stable content-revision uniqueness | Define revision vs approval-event semantics first. |

These are query-shape findings and index candidates, not claims based on EXPLAIN ANALYZE or production statistics. [E10,E22,E31,E32]

### 7.3 Transactions, retention and migration safety

- Default isolation and pre-read checks do not ensure last-admin, one-active-plan, or all document transition invariants. Use database enforcement where possible and bounded serializable/locking patterns only where needed. [F06,F19]
- GDPR is tombstoning, not deleting User. Documents retain identifying relationships and immutable hash/proof metadata; plaintext audit and notifications may retain personal information. [F11]
- Standard retention is executable at 90 days; compliance retention is currently indefinite despite seven-year comments. No configurable tenant retention or backup lifecycle implementation was found. [E34]
- The HNSW migration uses ordinary CREATE INDEX, so large live-table deployment may block writes/build for a material time. No expand/contract migration rehearsal is supplied. [E31]
- Organization-key backfill assumes the current org key corresponds to historical signatures; it cannot recover an already-lost historical key. CVDOC/employee-seal compatibility needs F21's explicit plan.
- Encryption extension refuses nested encrypted writes and filtering/sorting on encrypted content, correctly exposing those limitations. Raw SQL bypasses it, so raw-write reviews and regression tests remain necessary. Its field-name-based read walker is coupled to the schema; the invariant test is useful. [E11,E35]

## 8. Security and cryptographic assessment

### 8.1 Controls that actually exist

- RS256 JWT validation is algorithm-restricted. Passwords use bcrypt cost 12. Refresh, magic and verifier API keys are stored as hashes. The browser access token is memory-only. Membership/deactivation changes are loaded per authenticated request. [E02–E04,E20,E27]
- Global throttling includes public endpoints; login and recovery add per-email budgets. Step-up attempts are persisted and failures capped across a user's keys. Most budgets remain per process, while step-up uses DB audit rows. [E01,E12,E20,E42]
- Authorization distinguishes assigned manager from HR and prohibits manager self-approval. Recruiters have no ambient document-detail access. Public salary disclosure is restricted. Shared links have conditional view-cap enforcement. [E07,E17,E18]
- AES-256-GCM uses random 12-byte IVs and authenticated tags. Data keys are random, wrapped under an HKDF-derived KEK. Document bytes bind document ID, type, organization ID, holder ID and subject plus random salt. Role statements bind role/member/key/seal. [E09,E11–E13]
- Helmet, configured CORS, DTO validation, parameterized database calls, recursive payload checks and error envelopes are implemented. No unsafe raw SQL call or arbitrary server-side URL-fetch endpoint was located in the reviewed application. [E01,E22,E42]

### 8.2 Cryptographic limits and exact semantics

The signed document commitment is SHA-256 over CVDOC v2 bytes: tagged values, length prefixes, safe integers, sorted UTF-8 object keys and 32 raw salt bytes. It rejects null/floats rather than implementing RFC 8785. statementBytes has its own CVSTM v2 domain. The KMS adapter signs the raw statement hash using Node cryptoSign('sha256', ...); this applies the signature hash to the already-computed statement digest. That is a consistent custom protocol, not a standard VC proof suite. [E09,E13]

The hash does not bind mutable status/expiresAt/issuedAt fields outside subject, nor current organization display name/domain. Integrity of those fields relies on the database and service authorization. Public key pinning preserves a key value but does not establish an independently authenticated issuer key history. Strict encryption does not protect plaintext membership rows from a database writer obtaining genuine signatures through the application. The anchoring integrity gate checks decryption/hash, not all role signatures. [E07,E09,E14,E17]

The server possesses both organization RSA private keys and decryptable employee HMAC keys. HMACs are not publicly verifiable personal signatures. Encrypted object storage is genuine, but EncryptedStorageService.get accepts legacy plaintext objects even when field strict mode is enabled. A storage writer could replace an object with plaintext; the download path does not compare file bytes with the signed subject. [E13,E08]

### 8.3 Application and infrastructure security

| Surface | Assessment |
|---|---|
| CSRF | Double-submit guard applies in production to refresh/logout, but skips if the CSRF cookie is absent. The current production client uses same-origin Vercel proxying, so the commonly cited cross-origin cookie-reading failure is **not established for that topology**. Direct cross-site API deployment would require revisiting cookie delivery/readability. Test absence/tampering and fail closed. [E04,E27,E30] |
| XSS | React text rendering and input restrictions provide useful protection; no dangerouslySetInnerHTML use was found. Global markup rejection is not a replacement for sink encoding; generic member email HTML interpolation should consistently escape org text. No dynamic browser security audit was run. [E06,E29,E42] |
| SQL injection | Prisma and tagged vector queries parameterize values. No unsafe raw query API was located. Database-write compromise and authorization flaws remain separate risks. [E22] |
| SSRF / traversal | External service URLs are configuration-controlled; PDF generation uses bundled fonts, not browser URL rendering. Storage keys are generated from UUID document IDs, not public arbitrary paths. LocalStorageService itself lacks containment enforcement if future callers accept untrusted keys. [E08,E13] |
| Uploads | No current general file upload surface; do not report scanners or content-type validation as implemented. |
| Sensitive disclosure | Public experience/LOR fields can include personal names, employee codes and prose. Treat a document UUID as a privacy-relevant capability, not secrecy guaranteed by random IDs. Revocation reason text is also returned unless erased. [E17] |
| Secrets | Templates externalize deployment secrets. Fixed demo-login bypass, console magic links, unredacted API-key headers and share URL logs require F05/F18. No secret literals are reproduced here. |
| TLS and storage | HTTPS service URLs are configured; pg driver uses DATABASE_URL without an explicit CA policy in code. Supabase bucket privacy and database certificate enforcement are unknown. Supabase service role is broad backend authority. [E13,E30,E31] |
| Containers | Multistage backend build and AI model pre-cache are useful. No USER directive, digest pinning, security scanning workflow or restore proof was found. [E30] |

### 8.4 Threat model

| Threat | Attack scenario | Existing mitigation | Residual risk | Recommended improvement |
|---|---|---|---|---|
| Malicious org admin | Grants manager/HR roles to cooperating accounts and issues false facts | Distinct acting users; role checks; pinned keys | Authorized signatures prove acts, not truth; grants lack full audit trail | Verified invitation, grant audit, stronger approval policy for high-risk issuance |
| Compromised user account | Attacker reads documents, shares them or changes account state | Ownership checks; memory-only JWT; signing step-up | Existing JWT survives password change until expiry; knowledge answers may be known | Strong step-up, explicit session revocation/version and account-switch isolation |
| Pre-registered identity | Attacker claims employee address before invitation | Email format check, password hash | No ownership proof; later role attaches to attacker-controlled account | F01 verified identity and bound invitations |
| Compromised application server | Reads master key, unwraps RSA/employee keys, signs both roles | At-rest encryption | Server has full signing/decryption power | Managed custody, narrow service identities, monitored signing policy; retain honest trust model |
| Database read compromise | Dumps user/profile/derived data and encrypted content | Selected document/version fields encrypted | Names/emails, derived skills, audit and relationship metadata remain plaintext | Data minimization, access restrictions, justified targeted encryption |
| Database write compromise | Copies ciphertext or grants itself roles | AEAD, strict reads, identity-bound document hash | Cross-row plaintext disclosure; legitimate application signing after membership tampering; rollback | Record-bound AAD, restricted DB writers, authoritative grant audit and key history |
| Key-storage compromise | Steals wrapped org key blobs | Master-key wrapping | Master + blob compromise exposes signing; master loss destroys availability | Separate key custody, keyring/rotation, tested backups and recovery |
| Insider/log reader | Reads capability links or verifier keys in logs | Some header redaction | X-API-Key and share URLs not covered; console email prints links | F18 redaction and operational access/retention |
| Forged document | Modified PDF reuses a real document ID | Server verifies its stored content | Valid lookup does not authenticate the supplied PDF | Portable signed export, full-record comparison UX, artifact binding |
| Replay | Parallel magic-link or refresh requests | Expiry, purpose check, revokedAt | Non-atomic consume/rotate; incomplete family tracking | F07 transactional token lifecycle |
| Unauthorized verification | Recipient forwards shared URL | Random token, expiry, max views, deactivation | Bearer link remains transferable; public IDs reveal allowlisted data | Explicit disclosure policy, optional verifier-bound access when needed |
| Cross-tenant access | Shared actor audit or stale recruiter profile exposes other tenant | Service checks in many modules | F02/F03 and first-org context gaps | Explicit validated tenant IDs and regression suite |
| Chain/RPC failure | Transaction lands but DB commit fails; reorg after caching | Confirmations, polling, root lookup, unique proofs | Lost transaction intent and stale confirmation assumptions | Durable journal, lease, reorg-aware reconciliation |
| AI data misuse | Prose includes personal data or instructions; stale vectors influence rank | Field allowlist, document consent, discoverability | Free text can contain PII; heuristic confidence is not calibrated | Egress review, lifecycle checks, provenance and measured evaluation |

## 9. AI/ML audit

### 9.1 Implementation and provenance

| Layer | Actual implementation | Engineering assessment |
|---|---|---|
| Extraction | Groq HTTP JSON completion when keyed; vocabulary/regex fallback | Working adapter and fallback. Free-form LLM extraction can be wrong or influenced by input. No extraction-quality dataset/evaluation located. |
| Confidence | Heuristic assigns 0.6 per skill; Groq supplies numeric scores | Neither is calibrated confidence. Response schema does not constrain confidence to [0,1] or seniority to an enum. |
| Embedding | sentence-transformers/all-MiniLM-L6-v2, normalized; SHA-1 bucket hashing fallback | SHA-1 here is a non-security projection, not credential cryptography. Same-dimensional fallback is not semantically interchangeable. |
| Retrieval | pgvector cosine distance; best document per distinct holder; top 10 | Avoids one holder monopolizing results; forfeits the simple HNSW scan path. Selecting one document may miss complementary skills from others. |
| Rank training | 2,000 random feature rows, seed 42; target weighted sum plus noise; 200 trees | Reproducible synthetic demonstration, not empirical talent learning. Booster training does not explicitly pin every library/build/thread/random configuration. |
| Persistence | LightGBM text file at app/artifacts/ranking_model.txt; fit if absent | No manifest/checksum/schema compatibility check or outcome dataset version. Shared fixed temporary filename is not a multi-worker training lock; deployed image uses one worker. |
| Explanation | Native pred_contrib; base + contributions forms score | Faithful to the fitted booster up to rounding; does not establish fairness, causal importance or real-world accuracy. Fallback is algebraic attribution. |
| Integration | HTTP shared secret, text size bound 50,000, backend timeout | Public AI service configured as web; no per-client rate limit/body-wide candidate bound on /rank found. Health does not establish embedding readiness. |

Evidence: [E21–E26,E30].

### 9.2 Feature engineering

All six rank features are intended to be approximately in [0,1]:

- embedding_similarity: clamp cosine similarity into [0,1].
- skill_overlap: case-insensitive exact required-skill coverage, missing synonym normalization.
- seniority_fit: 1 minus rank-distance/3, missing values default 0.5.
- industry_overlap: fraction of candidate industry terms found as substrings in the job description.
- years_exp_fit: 1 above minimum, proportional below; missing candidate defaults 0.3, unspecified minimum 0.5.
- recency: linearly decays extraction time over 365 days, not credential issue time.

Weights are 0.40, 0.25, 0.15, 0.10, 0.07 and 0.03 respectively. There is no learned normalization pipeline. Python Candidate accepts unconstrained floats; the internal caller computes bounded values but the service boundary should validate them. The score is a relevance heuristic, not a probability of successful employment. [E22,E25,E26]

### 9.3 Appropriate next steps

First fix evidence eligibility and embedding-space provenance. Then record immutable feature snapshots, source document IDs, extractor/embedding/ranker versions and retrieval candidates. Establish extraction precision/recall on reviewed text, retrieval recall@k, rank NDCG@k/precision@k with defensible labels, contribution additivity, latency and fallback rate.

Use group/time splits to avoid the same holder or near-duplicate credential leaking across train/test. Outreach responses reflect holder interest and selection bias; record exposure and label provenance. Compare the direct weighted baseline with a genuinely trained booster before shipping model complexity. Monitor feature/missingness distributions and model versions before adding drift alarms. A model dashboard without reliable provenance would merely visualize unreliable numbers.

Fraud detection should begin with deterministic identity, duplicate-reference, lifecycle and signature checks. An ML fraud classifier is not justified without labeled fraud examples and a measurable false-positive tolerance.

## 10. Blockchain and distributed-systems audit

| Concern | Current implementation | Gap / judgment |
|---|---|---|
| Contract architecture | Small immutable registry with owner and authorized anchor mapping | Proportionate; no token economy, upgrade proxy or personal data storage is needed. |
| Access control | onlyOwner manages anchors; onlyAuthorized writes roots/revocations | Authorized wallets can anchor arbitrary roots; chain cannot validate off-chain truth. |
| Ownership | One-step transfer with nonzero new owner | Previous owner remains an authorized anchor until removed separately; operational rotation must address both roles. No two-step acceptance. |
| Events | RootAnchored, DocumentRevoked, authorization and ownership events | Good basis for reconciliation, but no durable backend event indexer exists. |
| Leaf/root construction | Raw 32-byte document hashes; SHA-256 sorted pairs; stable selection order | sortPairs does not globally sort leaves. Independent implementation must also match leaf order/odd-node behavior; vector fixtures help. |
| Proof mapping | Unique document proof with path, root ID and leaf index | One proof per document; batch commitment and DB mapping saved after transaction submission. |
| Independent reproduction | Merkle utility and fixture math are inspectable | Public API omits the full proof package and export verifier is absent; no supported independent end-user workflow. |
| Transactions | ethers gas estimation/send, tip floor, in-process serialization | No cross-process nonce ownership, replacement policy or durable nonce/tx journal. |
| Confirmations | Polling with configurable confirmations and timeouts | No finalized-block checkpoint/reorg rollback; positive root cache assumes permanence. |
| Retry | Existing-root check and optional RootAnchored event lookup | Exact-set retry only; no stable durable batch before submit. |
| Revocation | Contract idempotent; DB action primary | Fire-and-forget can diverge indefinitely; no signed public status history. |
| Local simulator | JSON ledger on disk | Read-modify-write without cross-process lock/atomic rename; not an independent trust boundary. |

Evidence: [E14–E17,E36]. The committed Amoy deployment JSON is evidence of intended deployment provenance, not independent evidence of current contract code, owner, funds or RPC reliability.

## 11. Testing and software quality

### 11.1 Coverage inventory

| Category | Located evidence | Main limitation |
|---|---|---|
| Backend unit | 36 suites, crypto, field extension, document RBAC/approval/revoke, employee keys, member/user, Merkle/RPC, adapters | Many service tests use mocked Prisma and cannot prove DB concurrency or constraints. |
| API/database integration | Six files: health, adversarial, encryption, erasure, signing-key durability, strict encryption | Mutate configured DB fixtures; not run under audit constraints. No verified production-like isolation/permissions run. |
| Browser E2E | Four Playwright specs: auth-session, document lifecycle, org/members, RBAC | Tests within a file share state; retries/isolated test execution need care. NODE_ENV=test disables throttling and production CSRF behavior. |
| Crypto | Serialization vectors, SHA/HMAC/Merkle, field encryption, key wrap/storage | Good negative tests; need record-transplant/replay and historical-format tests. |
| Contract | AnchorRegistry tests for roots, revocation, authorization, batches, ownership, invalid inputs | Not run; no installed contracts dependencies in this checkout. No reorg/nonce replica testing. |
| AI | Five pytest files for config, embeddings, extraction, API and ranking | Mostly contract/heuristic checks; no empirical quality or full booster evaluation. |
| Frontend unit | SHA-256 visualizer suite | Auth cache, forms, pagination and tenant switching have no comparable component coverage. |
| Security | Adversarial DTO/prototype/markup tests, role separation, crypto tampering | Missing email pre-registration, audit cross-tenant, stale recruiter membership and concurrent token tests. |
| Performance | Research microbenchmark source/results | Old hashing path; no reproducible full-stack load suite. |

### 11.2 Executed checks

| Command / scope | Result | Interpretation |
|---|---|---|
| Backend: node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --no-cache | 33 suites passed, 3 failed; 386 tests passed, 3 failed; 130.863 seconds | Tests were actually executed; this is not a coverage percentage. |
| Python: venv/Scripts/python.exe -B -m pytest -p no:cacheprovider tests/test_config.py tests/test_extraction.py tests/test_ranking.py -q | 9 passed | No model-download, lifespan training, external AI or DB integration run. |
| Client: node node_modules/vitest/vitest.mjs run | Could not start: module missing | Vitest is declared but missing from current installation; no package installation performed. |
| Client: node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --incremental false | Exit 1: missing Vitest module/types; two implicit-any errors in that test | Local setup not a clean build qualification. No emitted application output. |
| git status before report | Clean tracked tree | No source/config/documentation edits during analysis. |

Backend failures:

1. polygon-anchor.service.spec.ts:589 expected the loopback RPC stub to receive a request; observed zero. The test suppresses the underlying isRevoked error, so sandbox/network behavior versus adapter/runtime failure was not established. Treat as unresolved, not a confirmed production RPC defect.
2. encrypted-fields.spec.ts:42 found generated scalar enums missing current seal fields. Read-only inspection confirmed the ignored generated Document model lacks managerSeal/hrSeal. Source schema contains them. Prisma generation was deliberately not run because the audit prohibited generated source changes.
3. master-key.spec.ts:63 expects POSIX mode 0600; Windows reported 0666-equivalent mode bits. This test is not portable; actual Windows ACL security was not assessed.

No coverage report was generated or supplied as reliable current evidence. Installed artifacts may be stale. Full builds, dependency reinstalls, live database tests, E2E, contract compilation and external integrations remain unqualified.

### 11.3 Testing strategy by business criticality

1. Release gates: verified invitations, multi-org policy matrix, account-switch cache isolation, token replay/concurrency, signer/approver separation, and status/version conflicts.
2. Real disposable PostgreSQL tests: erasure versus in-flight jobs, last-admin contention, quota boundary, concurrent plans, duplicate outbox delivery and replica anchoring claims.
3. Crypto protocol fixtures: byte-level cross-language vectors, transplanted envelopes, algorithm-version dispatch, historical key validation, corrupt storage and wrong master key.
4. Failure-injection integration: process stop after commit/submit/store; storage/RPC/AI failures; reconciliation after restart; never mark successful external work solely from an HTTP request attempt.
5. Production-mode browser tests: same-origin proxy cookies, CSRF missing-cookie behavior, multiple tabs, signed-out redirects, pagination beyond 100 and multilingual multipage PDFs.
6. Contract tests on an ephemeral local chain; controlled reorg/receipt/funding failures in adapter tests.
7. AI baseline evaluation with saved fixtures, explicit fallback modes and genuine TreeSHAP-vs-prediction reconciliation.
8. Load tests only after correctness gates, with known dataset, hardware, concurrency, p50/p95/p99 latency, errors and resource limits.

## 12. DevOps and production readiness

The backend has useful building blocks: multistage Docker, explicit Prisma generation, environment validation, startup migrations, structured logging, a DB health query, and shutdown hooks. FastAPI has a standalone image, shared-secret production check and build-time embedding model download. Vercel proxying supports first-party auth cookies. [E01,E30]

Production blockers and missing operational evidence:

- Trusted deployment must reject demo identity bypasses and unsafe login modes. Templates are not proof of deployed settings.
- Add reproducible lockfiles and a clean build/test gate; pin CLI/runtime/model artifacts. A floating prisma@7 install after npm ci undermines reproducibility.
- Separate migration release step from each app replica startup. Rehearse additive schema changes and cryptographic compatibility on a scrubbed copy.
- Introduce non-root images, minimal writable paths and documented secret rotation/recovery; measure need before adding a container orchestration platform.
- Health currently proves database reachability, not storage decryptability for real existing rows, AI embedding readiness, wallet authorization/funds, cron lag or pending job recovery. The FieldCipher canary proves current encrypt/decrypt capability, not that the current key opens historical records.
- Add bounded request/job correlation, latency/error and saturation metrics, pending-work age, anchor/revocation lag, extraction fallback rate and failed erasure counts. No repository implementation of dashboards/alerts/traces or error-tracking integration was found.
- Back up database, object storage, JWT/organization/master-key material and configuration as distinct dependencies. Demonstrate restore into an isolated environment. A database backup without the correct master key is insufficient.
- WORKER=true on the API runs cron there. Horizontal replicas would all run schedules unless configuration or a distributed lease changes. Only Merkle cron sets Asia/Kolkata explicitly; other housekeeping schedules use the process timezone.
- AI is configured as a public web service, despite older Docker comments saying private. Authentication secret is mandatory on Python in production but optional in backend validation, so mismatched configuration can start the API and fail every AI call.
- No deployment, TLS, bucket-policy, backup, live wallet, or rollback verification was performed. Those are evidence gaps, not assertions of a known deployed compromise.

## 13. Product capability and gap analysis

| Capability | Actual status | Product conclusion / next decision |
|---|---|---|
| Single issuance with manager/HR workflow | IMPLEMENTED | Preserve; repair identity, transitions and post-commit work first. |
| Structured credential templates | IMPLEMENTED fixed three-type subjects/forms | User-configurable versioned templates are absent; add only with a real issuer need. |
| Expiration / revocation | IMPLEMENTED core, chain sync partial | Add reliable history/status publication before complex lifecycle options. |
| Renewal / supersession | NOT FOUND | Useful after baseline reliability: link a new issuance to the old, never mutate signed content. |
| Bulk issuance | DESIGNED schema; no current execution path | Worth adding for issuers after durable jobs; maintain manager/HR separation. |
| Batch verification | IMPLEMENTED via API key | Harden quotas and document semantics; do not describe as missing. |
| Public portal / share links | IMPLEMENTED | Clarify stored-record verification and disclosure policies. |
| QR verification | NOT FOUND in generation path | Low-cost later usability improvement; no cryptographic advantage by itself. |
| Offline proof / SDK | Historical docs, absent current implementation | High-value trust addition only with issuer key discovery and status semantics. |
| Issuer key discovery / historical rotation | Pinned key exists; full registry/rotation DESIGNED/PLANNED | Need authenticated history and compromise semantics, not a raw public-key endpoint alone. |
| Independent personal co-signing | NOT IMPLEMENTED | Current dual workflow is custodial. Strong step-up is the nearer-term improvement. |
| Revocation transparency | DB status + best-effort chain flag | Add reconciliation and a versioned public status mechanism. |
| Talent extraction / ranking | IMPLEMENTED heuristics and serving path | Prioritize eligibility, provenance and evaluation rather than new AI claims. |
| Fraud detection | NOT FOUND | Start with deterministic rule violations; defer ML without data. |
| Organization admin / roles | IMPLEMENTED with boundary gaps | Multi-org operation requires F01–F03 and consistent context. |
| Audit and organization analytics | IMPLEMENTED basic views | Fix scope, durability and missing membership events; no claim of immutable audit. |
| Usage analytics / retention configuration | PARTIAL counters and fixed cron | Clarify billing unit and add policy-based retention only after data inventory. |
| Developer API / API keys | IMPLEMENTED limited verification surface | Swagger and key management exist; versioned public docs, SDK, scopes, sandbox and webhook delivery are missing. |
| Payments | IMPLEMENTED simulation | Real collection, recurring lifecycle and financial reconciliation not present. |
| Queue / reconciliation / disaster recovery | NOT IMPLEMENTED operational system | Highest-value reliability work, no microservice split required. |

## 14. Ranked high-value additions

Effort is estimated engineering person-time for an engineer familiar with the stack, including focused tests and documentation, excluding vendor onboarding, dataset collection and organizational review. Estimates are not commitments; address P0 fixes before product expansion. The five most valuable additions overall are A1–A5.

### A1. Verified identity and explicit tenant authorization — rank 1

| Field | Assessment |
|---|---|
| Feature | Verified-email invitation acceptance, tenant-bound service context and audited role grants |
| Problem | F01–F04 permit misbound identity, cross-org access and cached cross-account disclosure |
| User value | Issuers can trust who received a role; users do not see another tenant/account's data |
| Technical value | Identity lifecycle, object authorization, tenant modeling and adversarial tests |
| Architecture | Extend existing auth/member modules; validate org context at service boundaries; reset client API state |
| Dependencies | User/member/profile schema, JWT membership loading, frontend persona/query keys |
| Complexity | High |
| Risk | Existing unverified accounts and memberships require a careful migration/acceptance policy |
| Priority | P0 |
| Effort | 2–3 person-weeks |
| Measurable outcome | All pre-registration, removed-membership, shared-actor audit and account-switch regression cases denied correctly |

### A2. Durable lifecycle outbox and reconciliation — rank 2

| Field | Assessment |
|---|---|
| Feature | PostgreSQL transactional outbox, leased bounded workers, retries and repair status |
| Problem | F06/F08/F11/F12: lost or racing PDFs, emails, extraction, deletion and chain effects |
| User value | Committed actions finish or expose a recoverable pending state |
| Technical value | Atomic event publication, at-least-once processing, idempotency and failure recovery |
| Architecture | Keep one backend codebase; commit work records alongside state, process with a separate command or leased worker role |
| Dependencies | Explicit document transitions/versioning, idempotent storage keys, transaction IDs |
| Complexity | High |
| Risk | Duplicate delivery and erasure races; external effects need stable deduplication keys |
| Priority | P1 |
| Effort | 3–5 person-weeks, incremental by job type |
| Measurable outcome | Fault-injection suite recovers after each commit/send boundary without duplicate business effects; oldest pending age is monitored |

### A3. Trust-safe cryptographic lifecycle and portable proof — rank 3

| Field | Assessment |
|---|---|
| Feature | Versioned record-bound envelopes, issuer key history, rotation recovery and signed export/verifier |
| Problem | F09/F10/F16/F21: ciphertext transplant, key loss, legacy incompatibility and server-only trust |
| User value | Credential survives controlled key changes and can be checked independently with explicit status freshness |
| Technical value | Cryptographic protocol design, key lifecycle, canonical export and reproducible verification |
| Architecture | Version the existing protocol; add authenticated issuer-key registry and export schema; optional managed KMS adapter after migration design |
| Dependencies | Stable issuer identity, audit trail, document format version, public status/revocation policy |
| Complexity | High |
| Risk | Breaking historical verification or exposing private HMAC keys; export must verify public RSA statements without releasing employee secrets |
| Priority | P1 foundations; P2 portable interoperability |
| Effort | 4–7 person-weeks split into reviewed increments |
| Measurable outcome | Independent verifier accepts genuine fixtures, rejects transplant/tamper cases, handles historical keys and reports unavailable/stale status separately |

### A4. Reproducible release, observability and recovery baseline — rank 4

| Field | Assessment |
|---|---|
| Feature | Clean CI build/test gates, production-mode checks, useful metrics/alerts and restore rehearsal |
| Problem | F20 and unmeasured capacity leave releases and recovery unqualified |
| User value | Fewer regressions and faster, demonstrable incident recovery |
| Technical value | Reproducible builds, SLOs, release safety and disaster recovery |
| Architecture | Existing containers plus CI and minimal telemetry; separate migration job; no new product microservices |
| Dependencies | Dependency lockfiles, disposable test DB, redacted logs, outbox metrics when A2 lands |
| Complexity | Medium |
| Risk | CI credentials or test target misconfiguration; use isolated least-privilege fixtures |
| Priority | P1 |
| Effort | 2–3 person-weeks initially |
| Measurable outcome | Clean checkout passes gates; restore drill meets agreed RPO/RTO; alerts detect stalled jobs and verification errors |

### A5. Credential-grounded matching with measurable provenance — rank 5

| Field | Assessment |
|---|---|
| Feature | Eligibility-aware profile projection, model-space versioning and baseline evaluation |
| Problem | F13–F15: stale credentials, mixed embeddings, synthetic model authority |
| User value | Recruiters see explainable scores backed by current eligible evidence |
| Technical value | Feature lineage, retrieval evaluation, reproducible experiments and model monitoring |
| Architecture | Extend ExtractedSkill/TalentMatch provenance; shared eligibility query; deterministic baseline retained |
| Dependencies | Consent/lifecycle events, A2 invalidation jobs, reviewed evaluation data |
| Complexity | Medium/high |
| Risk | Label bias and private data leakage; holder interest is not a qualification label |
| Priority | P1 correctness; P2 learned model |
| Effort | 2–4 person-weeks for provenance/evaluation infrastructure; data collection separate |
| Measurable outcome | No mixed-space comparisons or revoked evidence in results; versioned offline metrics and fallback rates visible |

### A6. Complete document operations and bounded lists

| Field | Assessment |
|---|---|
| Feature | Multipage PDF, real pagination/filtering, renewal/supersession and recoverable assignment changes |
| Problem | F16/F17 and absent renewal workflow |
| User value | Complete readable documents and access to full history |
| Technical value | Versioned lifecycle, rendering correctness and scalable query contracts |
| Architecture | Existing document/PDF/API/UI modules; append new issuance for renewal |
| Dependencies | A1 tenant context, transition fixes, A2 PDF repair |
| Complexity | Medium |
| Risk | Confusing old and new credentials or accidentally mutating signed content |
| Priority | P1 PDF/lists; P2 renewal |
| Effort | 2–3 person-weeks |
| Measurable outcome | No lost fields in long multilingual fixtures; every record beyond page 100 reachable; renewal chain explicit |

### A7. Safe bulk issuance

| Field | Assessment |
|---|---|
| Feature | Validated CSV dry run, row errors, resumable job and role-preserving approvals |
| Problem | BulkIssuanceBatch exists without executable workflow |
| User value | Organizations issue repeated credentials without repetitive manual entry |
| Technical value | Batch idempotency, bounded processing and partial-failure semantics |
| Architecture | Reuse document transition service and A2 worker; store row identity and outcomes |
| Dependencies | A1, A2, fixed templates, explicit bulk approval policy |
| Complexity | Medium/high |
| Risk | Mass incorrect issuance and bypassing two-person approval |
| Priority | P2 |
| Effort | 2–4 person-weeks |
| Measurable outcome | Interrupted batch resumes without duplicate credentials; invalid rows never issue; approver independence preserved |

### A8. Production billing and verifier entitlement ledger

| Field | Assessment |
|---|---|
| Feature | Real payment adapter, verified webhook inbox, renewal/refund handling and atomic metering |
| Problem | Demo billing plus quota/active-plan races |
| User value | Predictable paid plans and correct access after payment changes |
| Technical value | Idempotent external events, financial reconciliation and entitlement modeling |
| Architecture | Existing PaymentService interface plus event IDs and separate provider subscription/payment identifiers |
| Dependencies | A2 durable events, corrected subscription invariants, pricing/unit decision |
| Complexity | High |
| Risk | Incorrect charges, duplicate fulfillment, tax/refund requirements outside code audit |
| Priority | P2; mandatory before accepting real payment |
| Effort | 3–5 person-weeks plus provider/business setup |
| Measurable outcome | Duplicate/out-of-order provider events converge to correct entitlement; reconciliation finds no unexplained ledger differences |

### A9. Focused developer platform

| Field | Assessment |
|---|---|
| Feature | Versioned verification contract, narrow SDK/examples, key scopes and signed webhooks |
| Problem | Existing API keys/bulk API lack a supported integration lifecycle |
| User value | Verifiers integrate safely and receive credential status changes |
| Technical value | API compatibility, delivery semantics, signing and quota policy |
| Architecture | Extend current versioned API; SDK generated or small hand-maintained contract; outbox-backed delivery |
| Dependencies | A1, A2, A3 public trust/status design, stable pagination/error contracts |
| Complexity | Medium |
| Risk | Webhook destination SSRF, replay and sensitive payload disclosure |
| Priority | P2/P3 |
| Effort | 2–4 person-weeks |
| Measurable outcome | Example consumer passes contract tests; signatures/replay windows verified; deliveries can be retried and inspected |

### A10. Evidence-led capacity improvements

| Field | Assessment |
|---|---|
| Feature | Bounded batches, distributed rate policy and measured holder-profile retrieval |
| Problem | Unbounded fan-out, per-process coordination and exact retrieval scans |
| User value | Predictable response time as issuer and verifier traffic grows |
| Technical value | Backpressure, query planning, load testing and replica correctness |
| Architecture | Batch limits/leases first; Redis only when shared rate state is needed; projected vectors only after quality baseline |
| Dependencies | A1/A2/A4/A5 and representative load dataset |
| Complexity | Medium/high |
| Risk | ANN recall loss, stale caches and excessive operational dependencies |
| Priority | P2 after measured need |
| Effort | 2–4 person-weeks |
| Measurable outcome | Agreed latency/error targets met at stated dataset and concurrency; no duplicate wallet writers or tenant leakage |

## 15. Architectural benchmarking

These are conceptual comparisons against primary specifications, not claims of compliance, certification, wallet compatibility or full implementation parity. Sources were checked during the audit.

| Ecosystem | Established pattern | CareerVault alignment / difference | Worth adopting |
|---|---|---|---|
| W3C Verifiable Credentials 2.0 | Issuer/holder/verifier model, credential data model and explicit securing mechanisms | Similar actor model and integrity checks; custom binary record/signatures and server-only HMAC-assisted verification are not evidence of VC conformance. A custom did:careervault string has no implemented resolver. | Define a versioned export mapped to a selected VC securing mechanism, with interoperable issuer keys and status. First prove conformance with fixtures; do not relabel existing records as compliant. [VC Data Model](https://www.w3.org/TR/vc-data-model-2.0/) |
| Open Badges 3.0 | Achievement/skill credentials, defined metadata and interoperable exchange | CareerVault's employment letters and salary proofs differ from achievement badges. Extracted skill labels are not independently issued badges. | Adopt only for an actual training/achievement use case; avoid forcing salary letters into badge semantics. [Open Badges specification](https://www.imsglobal.org/spec/ob/v3p0) |
| EUDI Wallet ARF | Wallet-controlled attributes, defined issuance/presentation protocols and ecosystem trust relationships | CareerVault is a server-hosted career record system; no wallet unit, trust-list integration, device-bound holder presentation or relevant conformance evidence | Learn explicit issuer/verifier trust and disclosure boundaries; consider wallet protocols only with a concrete target integration. [Protocols](https://eudi.dev/latest/main/05-data-model-and-data-exchange-protocols/), [Trust model](https://eudi.dev/latest/main/06-trust-model/) |
| Blockcerts | Portable certificate verification with independent verifier tooling | Both use blockchain commitments conceptually; CareerVault currently exposes a server verdict and badge, withholding the portable proof package | Independent proof verification and issuer-key provenance have direct user value. Reuse compatible standards or clearly document a custom protocol rather than pretending an explorer link proves the whole credential. [Official verifier library](https://github.com/blockchain-certificates/cert-verifier-js) |

CareerVault's interesting differentiator is its combination of an actual employer approval workflow, encrypted evidence, role-specific attestation statements and consent-driven matching. Its weakness against interoperable credential ecosystems is portable trust, issuer key discovery, status distribution and holder-controlled presentation—not a shortage of blockchains.

## 16. Four-stage evolution roadmap

Stages are dependency-ordered. Estimates overlap A1–A10 and must not be summed as independent work. Acceptance criteria are proposed targets to agree with the team, not claims already achieved.

### Stage 1 — Engineering foundation

| Sequence / recommendation | Dependencies | Estimated effort | Expected outcome and acceptance criteria | Relevant modules |
|---|---|---|---|---|
| 1. Close identity and tenant gaps | None | 2–3 weeks | Verified invitations; cross-org audit/profile/message tests deny access; account switching clears cached data | auth, member, audit, recruiter, client auth/API [A1] |
| 2. Make state/token invariants atomic | Identity policy | 1–2 weeks | Concurrent sign/edit/delete and token redemption have one valid winner; last admin cannot be removed concurrently | document, tokens, magic links, member, Prisma [F06,F07,F19] |
| 3. Trusted configuration and safe logging | Environment policy | 2–4 days | Trusted startup rejects demo login/DNS; no verifier key or share token appears in captured logs | env validation, Pino, email, Render [F05,F18] |
| 4. Establish clean release gate and evidence-correct docs | Reproducible dependency setup | 1–2 weeks | Generated client matches schema; supported OS tests pass; clean client build; contract/isolated DB gates; docs no longer advertise absent modules | manifests, Docker, tests, documentation [A4,F20,F21] |

**Exit gate:** no known P0 path remains; clean reproducible validation and current architecture/cryptographic format inventory exist. Do not ship additional trust claims before this gate.

### Stage 2 — Product completeness

| Sequence / recommendation | Dependencies | Estimated effort | Expected outcome and acceptance criteria | Relevant modules |
|---|---|---|---|---|
| 5. Complete PDF and history UX | Stage 1 transition/tenant fixes | 1–2 weeks | Long/multilingual documents render every field; document/notification histories paginate without losing totals | pdf-generation, client lists, APISlice [A6] |
| 6. Minimal durable PDF/deletion worker and erasure completion | Defined state/version policy | 2–3 weeks | A committed issue is repairable; erasure prevents post-delete recreation and exposes completion/failure state | document, user, storage, new outbox within server [A2,F11] |
| 7. Renewal/supersession and safe reassignment | Immutable issuance semantics | 1–2 weeks | New credential references predecessor; reassignment is explicit and audited; old signatures untouched | document/schema/UI [A6] |
| 8. Pilot resumable bulk issuance | Durable worker and fixed templates | 2–4 weeks | CSV dry run, per-row result, duplicate replay safety and distinct manager/HR authorization | new bulk module, existing batch schema and transitions [A7] |

**Exit gate:** issuer and holder workflows complete reliably, with full history and recoverable artifacts. Real payments remain disabled unless A8 has separately passed qualification.

### Stage 3 — Advanced engineering

| Sequence / recommendation | Dependencies | Estimated effort | Expected outcome and acceptance criteria | Relevant modules |
|---|---|---|---|---|
| 9. Extend outbox and chain reconciliation | Stage 2 worker | 2–3 weeks | Stable batch/tx records survive crashes; one wallet writer lease; revocations converge; queue lag alert | Merkle, blockchain, notification, skill [A2,F12] |
| 10. Versioned crypto, key lifecycle and independent verification | Identity, format inventory, audited migration | 4–7 weeks | Transplant tests fail; historical versions verify appropriately; restore/rotation rehearsed; independent export verification works | crypto, KMS, Prisma encryption, verifier/export [A3] |
| 11. Matching provenance and evaluation | Consent/eligibility policy and outbox | 2–4 weeks | No ineligible evidence/mixed embeddings; held-out baseline metrics and exact provenance visible | AI, skill, talent, schema/UI [A5] |
| 12. Operational telemetry and failure drills | Durable state and release gates | 1–2 weeks | Alerts detect failed/stalled work; restart/restore exercises produce recorded outcomes | health/logging/metrics/deployment [A4] |

**Exit gate:** failure behavior is demonstrable, cryptographic claims are portable and bounded, and AI claims are measurable.

### Stage 4 — Production and ecosystem

| Sequence / recommendation | Dependencies | Estimated effort | Expected outcome and acceptance criteria | Relevant modules |
|---|---|---|---|---|
| 13. Production billing if monetization is required | Durable event inbox/outbox and plan invariants | 3–5 weeks | Verified replay-safe webhooks; renewal/cancel/refund reconciliation; accurate quota policy | payments, subscriptions, verifier keys [A8] |
| 14. Publish supported verifier integrations | Stable trust/status/API formats | 2–4 weeks | Versioned docs/examples/SDK; signed replay-resistant webhook delivery; sandbox fixtures | verification API and developer package [A9] |
| 15. Prove scale and harden deployment | Metrics, reliability, representative dataset | 2–4 weeks | Defined workload meets agreed latency/error targets; no duplicate workers; non-root images and isolated restore meet RPO/RTO | batches, rate limits, SQL, CI/hosting [A10,A4] |
| 16. Enterprise policy options only for demonstrated demand | Tenant model and data inventory | Scoped later | Retention, stronger admin recovery and issuer governance have explicit tested policies | org/admin/audit/retention |

A small team should finish one vertical increment at a time. A2's worker can remain PostgreSQL-backed; Redis/BullMQ is an option if measured throughput and operational experience justify it. Kafka, Kubernetes and domain microservices are not prerequisites.

## 17. Engineering maturity scorecard

Scores are qualitative judgments against a production credential-platform bar: 0 = absent, 5 = substantive prototype with important gaps, 8 = production-qualified with evidence, 10 = exceptional and independently demonstrated. They are not test coverage or an aggregate certification.

| Category | Score / 10 | Evidence | Main weakness |
|---|---:|---|---|
| Architecture | 6.5 | Cohesive Nest modules, adapter seams, isolated Python runtime [E01,E13,E24] | Inconsistent tenant context and post-commit boundaries |
| Backend engineering | 5.5 | DTO validation, common errors, conditional transitions [E01,E07] | Partial concurrency safety and recovery |
| Database design | 6.0 | 22 related models, useful uniqueness/indexes, migration history [E10,E31] | Missing cross-tenant/invariant constraints and evidence versioning |
| Security | 3.5 | Real RBAC, token hashing and throttles [E02,E04,E20] | Identity pre-registration, tenant leaks, demo trust bypass |
| Cryptography | 6.0 | Real AEAD, random salt/DEKs, role-bound statements and tests [E09,E11–E13] | Software custody, row-AAD gap, no master rotation/legacy dispatch |
| Blockchain | 5.5 | Small contract, Merkle proof math, confirmations and adapter tests [E14–E16] | No durable transaction lifecycle, replica/finality reconciliation |
| AI/ML | 4.0 | Working extraction/embedding/rank API and explicit fallback [E24–E26] | Synthetic ranker, mixed-space risk, no quality evaluation |
| Frontend | 6.0 | Typed feature folders, lazy routes, forms, tri-state session and errors [E27–E29] | Cross-account cache, 100-record cap and limited UI tests |
| Testing | 5.5 | 389 executed backend tests; meaningful crypto/security fixtures [E35–E37] | Three failures, no CI gate or concurrency/load qualification |
| DevOps | 4.0 | Containers, hosting config, health and shutdown [E01,E30] | Reproducibility, safe production profile and restore evidence |
| Scalability | 3.5 | Relational indexes, bounded public bulk size, some caches [E10,E20] | Unbounded batches, exact retrieval, local locks/limits; unmeasured |
| Documentation | 3.0 | Extensive decisions and operational intent [E38] | Absent-feature claims and outdated cryptographic architecture |
| Product completeness | 5.5 | Connected issuance/sharing/verification and recruiter portals [E07,E17,E22,E28] | Recovery, portable trust, complete histories and real billing |

### 17.1 Five strongest engineering decisions

1. Keeping personal credential content off-chain and batching commitments rather than storing documents on-chain. [E14,E16]
2. Binding document identity and role/member/key/seal in deterministic signing inputs, with pinned historical public keys. [E07,E09]
3. Centralizing selected field and file encryption behind existing Prisma/storage APIs, with strict-mode and tamper tests. [E11,E13,E35]
4. Enforcing assigned-manager signing and different-user HR approval, and excluding recruiter ambient document access. [E07]
5. Keeping ranking explanations deterministic and explicitly naming the synthetic heuristic model in the Python API, with a transparent fallback. [E25]

### 17.2 Five most serious weaknesses

1. Identity ownership is not established before privileges attach. [F01,F05]
2. Tenant and browser-account boundaries are inconsistent. [F02–F04]
3. Business state and external effects have incomplete atomicity/recovery. [F06–F08,F11,F12]
4. Crypto custody, row binding and protocol migration do not justify broad independence/tamper-proof claims. [F09,F10,F21]
5. Production readiness and ML quality are described more strongly than demonstrated. [F13–F15,F20]

### 17.3 Five missing capabilities with highest impact

Verified invitation/tenant lifecycle; durable outbox/reconciliation; trustworthy key/protocol lifecycle with portable proofs; reproducible release/restore/observability; eligibility-aware versioned matching evaluation. These are A1–A5, not an invitation to build every possible platform feature.

### 17.4 Avoid or simplify

- Do not introduce token economics, NFTs, multiple chains, per-document on-chain payloads or upgradeable contract machinery for this use case.
- Do not replace deterministic ranking with an LLM explanation/ranking layer. The existing LLM extraction boundary already needs quality and privacy validation.
- Do not build ML fraud detection without labeled data and clear error-cost targets.
- Do not pursue full EUDI wallet certification or broad VC/Open Badges support before a real integration target exists.
- Do not split the monolith into microservices or add Kafka/Kubernetes to compensate for missing transaction boundaries.
- Simplify the synthetic LightGBM approximation when it adds no demonstrated value over the weighted baseline; keep it only as clearly marked serving/explanation scaffolding.
- Consolidate duplicated KMS cryptographic internals; retain real transport adapters.
- Remove unsupported driver choices/dependencies or clearly mark them unavailable; do not add elaborate provider abstractions around nonexistent providers.
- Keep the SHA-256 visualizer as optional educational/demo content, not part of the credential trust boundary.
- Reduce documentation duplication and make one evidence-linked status map authoritative only after it matches code.

## 18. Top five immediate priorities and final answers

### Immediate priorities

| Order | Action | Done when |
|---|---|---|
| 1 | Require verified identity for privileged invitations; reject unsafe trusted-production modes | Pre-registration and domain-bypass regression cases fail safely |
| 2 | Fix audit/recruiter/message tenancy and reset frontend authenticated caches | Two-org/two-account adversarial tests show no cross-boundary data |
| 3 | Make all document/token/admin invariants atomic | Concurrent operations produce one valid transition and no orphaned org |
| 4 | Add durable PDF/erasure/chain work and repair status | Process termination/failure injection recovers without lost effects or recreated erased data |
| 5 | Establish clean reproducible validation and correct current documentation | Clean builds, supported-platform tests and accurate protocol/feature inventory are release gates |

**What is CareerVault today?** A substantive, custodial employer-document issuance and server-side verification prototype with encrypted evidence, optional blockchain receipts and heuristic talent matching.

**What is its most important technical differentiator?** The integration of a two-person employer approval workflow with identity-bound document hashing, role-bound seals/signatures, encrypted records and batched public commitments. The integration is stronger than any claim that the ML is trained or that verification is decentralized.

**What prevents production readiness?** Unverified identity binding, tenant/cache leaks, unsafe demo production options, incomplete concurrency/recovery, key lifecycle gaps, incomplete erasure completion, and missing reproducible operational qualification.

**What three additions create the greatest improvement?** A1 verified identity/tenant boundaries; A2 durable transactional workflow and reconciliation; A3 cryptographic lifecycle and portable verification. A4 release/restore evidence is a prerequisite throughout.

**What would a senior engineer criticize?** The mismatch between documentation and execution; treating warning-only demo settings as production configuration; mutable database authorization underpinning cryptographic claims; partial transaction guards; lack of durable external-effect tracking; unversioned embeddings and synthetic ML claims; and absence of measured capacity/recovery evidence.

**What should be implemented next, and why?** Close F01–F05 with regression tests before adding product features. They determine whether the system is acting for the correct person and organization. A cryptographically correct signature on an incorrectly authorized credential is still a product failure.

## 19. Evidence index

Paths refer to this checkout. Functions are the stable locator where line numbers may change. References describe implementation evidence, not documentation assertions.

| ID | Source and symbol / execution responsibility |
|---|---|
| E01 | [main.ts](D:/Coding/Project/CareerVault/server/src/main.ts), bootstrap; [app.module.ts](D:/Coding/Project/CareerVault/server/src/app.module.ts), global guards, logging and module registration |
| E02 | [auth.service.ts](D:/Coding/Project/CareerVault/server/src/modules/auth/auth.service.ts), register/login/buildResult/changePassword; [register.dto.ts](D:/Coding/Project/CareerVault/server/src/modules/auth/dto/register.dto.ts) |
| E03 | [tokens.service.ts](D:/Coding/Project/CareerVault/server/src/modules/auth/tokens.service.ts:43), rotate/rotateRecord; [auth.module.ts](D:/Coding/Project/CareerVault/server/src/modules/auth/auth.module.ts), JWT TTL; [jwt-keys.ts](D:/Coding/Project/CareerVault/server/src/modules/auth/jwt-keys.ts), key loading |
| E04 | [magic-link.service.ts](D:/Coding/Project/CareerVault/server/src/modules/auth/magic-link.service.ts:72), verifyAndConsume; [auth.controller.ts](D:/Coding/Project/CareerVault/server/src/modules/auth/auth.controller.ts), cookies; [jwt.strategy.ts](D:/Coding/Project/CareerVault/server/src/modules/auth/strategies/jwt.strategy.ts), validate; [csrf.guard.ts](D:/Coding/Project/CareerVault/server/src/common/guards/csrf.guard.ts); [roles.guard.ts](D:/Coding/Project/CareerVault/server/src/common/guards/roles.guard.ts) |
| E05 | [organization.service.ts](D:/Coding/Project/CareerVault/server/src/modules/organization/organization.service.ts), create/verifyDomain/listManagers; [organization.controller.ts](D:/Coding/Project/CareerVault/server/src/modules/organization/organization.controller.ts); [org-access.ts](D:/Coding/Project/CareerVault/server/src/common/utils/org-access.ts), membershipFor/assertOrgRole |
| E06 | [member.service.ts](D:/Coding/Project/CareerVault/server/src/modules/member/member.service.ts), add/deactivate |
| E07 | [document.service.ts](D:/Coding/Project/CareerVault/server/src/modules/document/document.service.ts:80), request; lines 113 updateDraft, 149 sign, 272 approve, 423 reject, 465 revoke, 523 resubmitRequest, 591 delete, 604 returnByManager, 644 getById, 689 list, 831 ensureOrgKey, 895 writeAudit; [document.controller.ts](D:/Coding/Project/CareerVault/server/src/modules/document/document.controller.ts); [content-validation.ts](D:/Coding/Project/CareerVault/server/src/modules/document/content-validation.ts) |
| E08 | [pdf-generation.service.ts](D:/Coding/Project/CareerVault/server/src/modules/document/pdf-generation.service.ts:112), generateAndStore; line 180 embedAnchorMetadata; [pdf-storage-key.ts](D:/Coding/Project/CareerVault/server/src/modules/document/pdf-storage-key.ts) |
| E09 | [document-bytes.ts](D:/Coding/Project/CareerVault/server/src/common/crypto/document-bytes.ts), encodeValue/documentBytes/statementBytes; [crypto.util.ts](D:/Coding/Project/CareerVault/server/src/common/utils/crypto.util.ts), hashes/seals; [document-seal.ts](D:/Coding/Project/CareerVault/server/src/modules/document/document-seal.ts), sealAndSign |
| E10 | [schema.prisma](D:/Coding/Project/CareerVault/server/prisma/schema.prisma), 22 model definitions, indexes/relationships; [initial migration](D:/Coding/Project/CareerVault/server/prisma/migrations/20260607120243_init/migration.sql) |
| E11 | [prisma.module.ts](D:/Coding/Project/CareerVault/server/src/prisma/prisma.module.ts), extended client factory; [prisma.service.ts](D:/Coding/Project/CareerVault/server/src/prisma/prisma.service.ts); [field-encryption.extension.ts](D:/Coding/Project/CareerVault/server/src/prisma/encryption/field-encryption.extension.ts), sealArgs/openResult; [encrypted-fields.ts](D:/Coding/Project/CareerVault/server/src/prisma/encryption/encrypted-fields.ts) |
| E12 | [employee-key.service.ts](D:/Coding/Project/CareerVault/server/src/modules/employee-key/employee-key.service.ts), enroll/unlock/open; [key-derivation.ts](D:/Coding/Project/CareerVault/server/src/modules/employee-key/key-derivation.ts); [employee-key-reset.service.ts](D:/Coding/Project/CareerVault/server/src/modules/employee-key/employee-key-reset.service.ts); [step-up-lockout.ts](D:/Coding/Project/CareerVault/server/src/modules/employee-key/step-up-lockout.ts); [employee-key-wrap.ts](D:/Coding/Project/CareerVault/server/src/services/key-management/employee-key-wrap.ts) |
| E13 | [field-cipher.ts](D:/Coding/Project/CareerVault/server/src/services/key-management/field-cipher.ts:23), aadFor/encrypt/open; [local-kms.service.ts](D:/Coding/Project/CareerVault/server/src/services/key-management/local-kms.service.ts); [supabase-kms.service.ts](D:/Coding/Project/CareerVault/server/src/services/key-management/supabase-kms.service.ts); [master-key.ts](D:/Coding/Project/CareerVault/server/src/services/key-management/master-key.ts); [encrypted-storage.service.ts](D:/Coding/Project/CareerVault/server/src/services/storage/encrypted-storage.service.ts); [supabase-storage.service.ts](D:/Coding/Project/CareerVault/server/src/services/storage/supabase-storage.service.ts); [local-storage.service.ts](D:/Coding/Project/CareerVault/server/src/services/storage/local-storage.service.ts); module factories in the same directories |
| E14 | [merkle.service.ts](D:/Coding/Project/CareerVault/server/src/modules/merkle/merkle.service.ts:66), runBatch; [integrity-gate.ts](D:/Coding/Project/CareerVault/server/src/modules/merkle/integrity-gate.ts), integrityGate/failureOf; [merkle.util.ts](D:/Coding/Project/CareerVault/server/src/common/utils/merkle.util.ts); [merkle.cron.ts](D:/Coding/Project/CareerVault/server/src/modules/merkle/merkle.cron.ts); [merkle.controller.ts](D:/Coding/Project/CareerVault/server/src/modules/merkle/merkle.controller.ts) |
| E15 | [polygon-anchor.service.ts](D:/Coding/Project/CareerVault/server/src/services/blockchain/polygon-anchor.service.ts), write/readRoot/findAnchorTx; [anchor-chain.util.ts](D:/Coding/Project/CareerVault/server/src/services/blockchain/anchor-chain.util.ts), connectAnchorChain/waitForConfirmations; [local-anchor.service.ts](D:/Coding/Project/CareerVault/server/src/services/blockchain/local-anchor.service.ts) |
| E16 | [AnchorRegistry.sol](D:/Coding/Project/CareerVault/contracts/contracts/AnchorRegistry.sol), anchorRoot/revokeDocument/transferOwnership and mappings/events |
| E17 | [verification.service.ts](D:/Coding/Project/CareerVault/server/src/modules/verification/verification.service.ts:68), verifyByDocumentId/verifyBulk/verifyByToken/present; [verification-checks.ts](D:/Coding/Project/CareerVault/server/src/modules/verification/verification-checks.ts:57), runChecks/signerValid; [anchor-badge.ts](D:/Coding/Project/CareerVault/server/src/modules/verification/anchor-badge.ts); [verification.controller.ts](D:/Coding/Project/CareerVault/server/src/modules/verification/verification.controller.ts); [public-fields.ts](D:/Coding/Project/CareerVault/server/src/modules/document/public-fields.ts) |
| E18 | [share-link.service.ts](D:/Coding/Project/CareerVault/server/src/modules/share-link/share-link.service.ts), create/list/deactivate; [share-link.cron.ts](D:/Coding/Project/CareerVault/server/src/modules/share-link/share-link.cron.ts) |
| E19 | [payments.service.ts](D:/Coding/Project/CareerVault/server/src/modules/payment/payments.service.ts), mockComplete/handleWebhook/fulfill; [payment.module.ts](D:/Coding/Project/CareerVault/server/src/services/payment/payment.module.ts); [mock-stripe.service.ts](D:/Coding/Project/CareerVault/server/src/services/payment/mock-stripe.service.ts); [subscription.service.ts](D:/Coding/Project/CareerVault/server/src/modules/subscription/subscription.service.ts) |
| E20 | [api-key.guard.ts](D:/Coding/Project/CareerVault/server/src/common/guards/api-key.guard.ts), canActivate/enforceMonthlyQuota; [verifier-key.service.ts](D:/Coding/Project/CareerVault/server/src/modules/verifier-key/verifier-key.service.ts); [verifier-rate-limits.constants.ts](D:/Coding/Project/CareerVault/server/src/config/verifier-rate-limits.constants.ts); [bulk-verify.dto.ts](D:/Coding/Project/CareerVault/server/src/modules/verification/dto/bulk-verify.dto.ts) |
| E21 | [skill.service.ts](D:/Coding/Project/CareerVault/server/src/modules/skill/skill.service.ts), extractForDocument/buildText/setDiscoverability |
| E22 | [recruiter.service.ts](D:/Coding/Project/CareerVault/server/src/modules/recruiter/recruiter.service.ts:24), ensureProfile/createJobOpening; [talent.service.ts](D:/Coding/Project/CareerVault/server/src/modules/recruiter/talent.service.ts:59), search/listMatches/skillsByHolder and feature helpers |
| E23 | [message.service.ts](D:/Coding/Project/CareerVault/server/src/modules/recruiter/message.service.ts:23), send/listSent/listReceived/respond; [message.controller.ts](D:/Coding/Project/CareerVault/server/src/modules/recruiter/message.controller.ts); recruiter/talent controllers in same directory |
| E24 | [ai-client.service.ts](D:/Coding/Project/CareerVault/server/src/services/ai/ai-client.service.ts), post/extractSkills/embed/rank; [main.py](D:/Coding/Project/CareerVault/ai-service/app/main.py), lifespan and endpoints; [config.py](D:/Coding/Project/CareerVault/ai-service/app/config.py) |
| E25 | [ranking.py](D:/Coding/Project/CareerVault/ai-service/app/ranking.py:85), _fit_booster; line 110 load_model, 165 _rank_weighted, 180 _rank_model, 207 rank |
| E26 | [extraction.py](D:/Coding/Project/CareerVault/ai-service/app/extraction.py:66), _heuristic/_groq/extract; [embeddings.py](D:/Coding/Project/CareerVault/ai-service/app/embeddings.py:62), embed; [schemas.py](D:/Coding/Project/CareerVault/ai-service/app/schemas.py) |
| E27 | [APISlice.ts](D:/Coding/Project/CareerVault/client/src/apis/APISlice.ts), baseQuery/refreshSession; [APIEndpoints.ts](D:/Coding/Project/CareerVault/client/src/config/APIEndpoints.ts); [store.ts](D:/Coding/Project/CareerVault/client/src/store.ts) |
| E28 | [routes.tsx](D:/Coding/Project/CareerVault/client/src/routes.tsx); [roles.ts](D:/Coding/Project/CareerVault/client/src/lib/roles.ts); [VerifyHome.tsx](D:/Coding/Project/CareerVault/client/src/pages/Verify/VerifyHome.tsx); [parse.ts](D:/Coding/Project/CareerVault/client/src/features/verification/parse.ts) |
| E29 | [authSlice.ts](D:/Coding/Project/CareerVault/client/src/features/auth/authSlice.ts); [authApi.ts](D:/Coding/Project/CareerVault/client/src/features/auth/authApi.ts); [auth hooks](D:/Coding/Project/CareerVault/client/src/features/auth/hooks.ts); [document api](D:/Coding/Project/CareerVault/client/src/features/document/api.ts); [useDocumentFilters.ts](D:/Coding/Project/CareerVault/client/src/features/document/useDocumentFilters.ts); [NotificationBell.tsx](D:/Coding/Project/CareerVault/client/src/features/notification/components/NotificationBell.tsx); [TalentSearch.tsx](D:/Coding/Project/CareerVault/client/src/pages/Recruiter/TalentSearch.tsx); [ShapExplanation.tsx](D:/Coding/Project/CareerVault/client/src/features/recruiter/components/ShapExplanation.tsx) |
| E30 | [Dockerfile](D:/Coding/Project/CareerVault/Dockerfile); [start.sh](D:/Coding/Project/CareerVault/start.sh); [render.yaml](D:/Coding/Project/CareerVault/render.yaml); [AI Dockerfile](D:/Coding/Project/CareerVault/ai-service/Dockerfile); [vercel.json](D:/Coding/Project/CareerVault/client/vercel.json); [env.validation.ts](D:/Coding/Project/CareerVault/server/src/config/env.validation.ts) |
| E31 | [prisma.config.ts](D:/Coding/Project/CareerVault/server/prisma.config.ts); [HNSW migration](D:/Coding/Project/CareerVault/server/prisma/migrations/20260810154422_pgvector_ann_index/migration.sql); [public-key migration](D:/Coding/Project/CareerVault/server/prisma/migrations/20260818124432_document_signing_public_key/migration.sql); [employee-key migration](D:/Coding/Project/CareerVault/server/prisma/migrations/20261031142643_employee_keys/migration.sql); [certs README](D:/Coding/Project/CareerVault/server/certs/README.md) |
| E32 | [audit.service.ts](D:/Coding/Project/CareerVault/server/src/modules/audit/audit.service.ts:15), list; [analytics.service.ts](D:/Coding/Project/CareerVault/server/src/modules/analytics/analytics.service.ts), overview |
| E33 | [user.service.ts](D:/Coding/Project/CareerVault/server/src/modules/user/user.service.ts:60), deleteAccount; line 145 deletePdfs |
| E34 | [notification.service.ts](D:/Coding/Project/CareerVault/server/src/modules/notification/notification.service.ts), notify/list; [retention.cron.ts](D:/Coding/Project/CareerVault/server/src/modules/maintenance/retention.cron.ts); [subscription-expiry.cron.ts](D:/Coding/Project/CareerVault/server/src/modules/maintenance/subscription-expiry.cron.ts) |
| E35 | [server package.json](D:/Coding/Project/CareerVault/server/package.json), Jest config/scripts; [encrypted-fields.spec.ts](D:/Coding/Project/CareerVault/server/src/prisma/encryption/encrypted-fields.spec.ts:42); [master-key.spec.ts](D:/Coding/Project/CareerVault/server/src/services/key-management/master-key.spec.ts:63); [polygon-anchor.service.spec.ts](D:/Coding/Project/CareerVault/server/src/services/blockchain/polygon-anchor.service.spec.ts:589); [test config](D:/Coding/Project/CareerVault/server/test/jest-e2e.json); remaining unit/API families inventoried in section 11 |
| E36 | [AnchorRegistry.test.ts](D:/Coding/Project/CareerVault/contracts/test/AnchorRegistry.test.ts); [hardhat.config.ts](D:/Coding/Project/CareerVault/contracts/hardhat.config.ts); [deployment record](D:/Coding/Project/CareerVault/contracts/deployments/amoy.json) |
| E37 | [playwright.config.ts](D:/Coding/Project/CareerVault/e2e/playwright.config.ts); [e2e/env.ts](D:/Coding/Project/CareerVault/e2e/env.ts); [prepare-db.mjs](D:/Coding/Project/CareerVault/e2e/scripts/prepare-db.mjs); [document-lifecycle.spec.ts](D:/Coding/Project/CareerVault/e2e/specs/document-lifecycle.spec.ts); other specs in same folder |
| E38 | [IMPLEMENTATION_STATUS.md](D:/Coding/Project/CareerVault/documentation/IMPLEMENTATION_STATUS.md); [architecture.md](D:/Coding/Project/CareerVault/documentation/architecture.md); [api.md](D:/Coding/Project/CareerVault/documentation/api.md); [cryptography.md](D:/Coding/Project/CareerVault/documentation/cryptography.md); [ai-and-xai.md](D:/Coding/Project/CareerVault/documentation/ai-and-xai.md); [roadmap.md](D:/Coding/Project/CareerVault/documentation/roadmap.md); [DECISIONS.md](D:/Coding/Project/CareerVault/documentation/DECISIONS.md) |
| E39 | [research benchmark](D:/Coding/Project/CareerVault/research-paper/build/bench.mjs); repository inventory of demo/research binaries and generated artifacts |
| E40 | [client package.json](D:/Coding/Project/CareerVault/client/package.json); [client .gitignore](D:/Coding/Project/CareerVault/client/.gitignore); [server package.json](D:/Coding/Project/CareerVault/server/package.json); [AI requirements](D:/Coding/Project/CareerVault/ai-service/requirements.txt); source-reference searches for unused dependency/schema candidates |
| E41 | [local-dns.service.ts](D:/Coding/Project/CareerVault/server/src/services/dns/local-dns.service.ts); [real-dns.service.ts](D:/Coding/Project/CareerVault/server/src/services/dns/real-dns.service.ts); [email.module.ts](D:/Coding/Project/CareerVault/server/src/services/email/email.module.ts); [gmail-email.service.ts](D:/Coding/Project/CareerVault/server/src/services/email/gmail-email.service.ts); [console-email.service.ts](D:/Coding/Project/CareerVault/server/src/services/email/console-email.service.ts) |
| E42 | [email-rate-limit.guard.ts](D:/Coding/Project/CareerVault/server/src/common/guards/email-rate-limit.guard.ts); [test-env-throttler.guard.ts](D:/Coding/Project/CareerVault/server/src/common/guards/test-env-throttler.guard.ts); [http-exception.filter.ts](D:/Coding/Project/CareerVault/server/src/common/filters/http-exception.filter.ts); [payload-inspection.ts](D:/Coding/Project/CareerVault/server/src/common/middleware/payload-inspection.ts) |
| E43 | [test_ranking.py](D:/Coding/Project/CareerVault/ai-service/tests/test_ranking.py); [test_extraction.py](D:/Coding/Project/CareerVault/ai-service/tests/test_extraction.py); [test_config.py](D:/Coding/Project/CareerVault/ai-service/tests/test_config.py); [test_main.py](D:/Coding/Project/CareerVault/ai-service/tests/test_main.py); [test_embeddings.py](D:/Coding/Project/CareerVault/ai-service/tests/test_embeddings.py) |
| E44 | [sha256Trace.test.ts](D:/Coding/Project/CareerVault/client/src/features/sha256-lab/sha256Trace.test.ts); [health.controller.ts](D:/Coding/Project/CareerVault/server/src/health/health.controller.ts); [system-status.service.ts](D:/Coding/Project/CareerVault/server/src/health/system-status.service.ts) |
| E45 | [server environment template](D:/Coding/Project/CareerVault/server/.env.example); [client environment template](D:/Coding/Project/CareerVault/client/.env.example); [AI environment template](D:/Coding/Project/CareerVault/ai-service/.env.example); [contract environment template](D:/Coding/Project/CareerVault/contracts/.env.example); only configuration roles/names were used, no private environment values |

**Report integrity:** findings and recommendations were completed before this file was created. Existing documentation remains preserved; this audit supersedes none of it silently. Future fixes should update the relevant original documents as a separately authorized development task.
