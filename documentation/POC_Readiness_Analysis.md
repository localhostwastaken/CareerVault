# CareerVault — POC Readiness Analysis

> **STATUS UPDATE (2026-08-10):** All 10 **Critical for POC** items and the **Fast-follows** below have since been
> implemented and verified (server typecheck clean · 30 unit tests passing · server + client builds clean ·
> client lint clean · runtime smoke tests passing end-to-end). The findings below are preserved as the original
> audit record; see **Part G — Implementation record** at the end for what changed and how it was verified.

> **Prepared as:** an end-to-end business + technical review to make CareerVault a robust, credible **investor-demo POC**.
> **Framing decisions (confirmed with the owner):** audience = **investor / pitch demo**; market = **India-first** (INR, real Indian document conventions); recruiter = **internal hiring member** who sees **public candidate profiles + applicants' documents only as granted**; the **cryptographic trust story is the core value proposition** (so crypto correctness is must-fix, not a simplification).
> **Date:** 2026-08-10. Based on commit `30baae7` (branch `ui-ux-revamp`).

---

## TL;DR — the verdict

CareerVault is a **well-above-average build** with a genuinely good architecture (swappable adapters, clean NestJS modules, solid RTK Query data layer, an end-to-end recruiter loop that actually closes). The bones are strong.

But three things stand between it and a demo that survives scrutiny, and all three are fixable:

1. **The trust story doesn't currently hold up under inspection.** The headline "dual signature" is **one org key signing the same hash twice with deterministic padding**, so the manager and HR signatures are byte-identical — two of the six verification checks are literally the same check. And a correctly-issued document reads **`INVALID` for up to 24 hours** until the midnight Merkle cron anchors it. If crypto is the pitch, these are showstoppers.
2. **The documents are thin and unenforced** — exactly as you flagged. The field lists live *only in the client*; the server accepts `{}` as a valid salary proof. The three types don't resemble real Indian artifacts. This report includes a full **India-first redesign** (relieving letters, CTC-broken-down salary certificates, recommender-bound LORs) with server-enforced schemas and a "simplest-default + progressive-disclosure" UX.
3. **The shipping production config quietly disables the product.** DNS verification is bypassed (anyone can issue as `google.com`), sessions die at 15 minutes, and payments/email/blockchain/keys are all on mock/local drivers. For a *hosted* demo, a few of these are practical showstoppers; the rest just need an honest "this is mocked" framing.

Everything below is organized so you can act on it in priority order. **Part F is the prioritized plan** — start there if you want the punchline; Parts B–E are the evidence.

---

## How to read this

- Findings are tiered: **🔴 Demo-blocker** (breaks the happy path or the story under scrutiny), **🟠 Credibility** (a sharp investor/technical-DD reviewer will catch it), **🟡 Fast-follow** (real for a production MVP, invisible in a 20-minute demo).
- File references are clickable and point at the real code.
- The document redesign (Part D) is the part you explicitly asked for — it's the most detailed section.

---

## Part A — Product & architecture mental model

**What it is.** A "Web 2.5" career-document verification platform. Organisations issue cryptographically signed, dual-approved career documents; employees hold them in a lifelong wallet; anyone verifies authenticity via a six-step check, with daily Merkle roots anchored on a public ledger for tamper-evidence. Bolted on: recruiter talent-matching (pgvector + an ML ranker with SHAP), share links, subscriptions, and a verifier API.

**Stack.** NestJS 11 / Prisma 7 / Postgres+pgvector API · React 19 / Vite / RTK Query client · FastAPI AI service · Hardhat/Solidity `AnchorRegistry`. The defining decision: **every heavy integration (KMS, blockchain, payments, email, storage, DNS) sits behind a swappable adapter, and the shipping config runs all six on local/mock** — which is what lets the stack run with zero cloud accounts, and also the source of most "not real yet" findings.

**The document lifecycle (as implemented):** `REQUESTED → DRAFT → PENDING_HR → ISSUED → ANCHORED`, with `REVOKED`/`EXPIRED` terminal, plus manager-return and holder-resubmit loops. Dual approval = manager signs, HR co-signs. Verification recomputes hash → manager sig → HR sig → Merkle proof → on-chain root → revocation/expiry.

**What's genuinely strong** (keep and lean on these):
- Org-scoped document mutations are **solidly IDOR-proof** — every transition re-checks an *active* membership via `requireMember` ([document.service.ts](server/src/modules/document/document.service.ts)). This is the best code in the repo.
- TOCTOU-safe share-link view counting (conditional `updateMany`).
- Central `{success,data,meta}` envelope unwrap + one `QueryBoundary` for loading/error/empty across the client.
- Refresh tokens are rotated and stored hashed; the JWT strategy re-checks `isActive`/`gdprDeletedAt` on every request (a working kill-switch).
- The recruiter → holder → reply loop closes end-to-end — rare for a build at this stage.

---

## Part B — Business-logic gap analysis

### 🔴 Demo-blockers

**B1. A freshly issued document verifies as `INVALID`.**
The `VERIFIED` verdict requires `anchorStatus === 'pass'` ([verification.service.ts](server/src/modules/verification/verification.service.ts)), but anchoring only happens at the **midnight Merkle cron**. Between issuance and that cron (up to ~24h, longer if `WORKER` is off), a legitimate, correctly-signed, hash-matching document falls through to **`INVALID`**. On stage you will issue a document, verify it, and it will say invalid. *Fix:* introduce a `VERIFIED_PENDING_ANCHOR` verdict (signatures valid, awaiting anchor) that is visibly "green with an asterisk," and/or expose a manual "Run anchoring now" so the demo can show the full six-step pass on command.

**B2. Org creation from a Holder persona silently dead-ends.**
The router deliberately lets a HOLDER reach `/app/org` to found an org, but after `createOrg` the client only adopts the new org if a membership matches the *active* persona (`ORG_ADMIN` ≠ `HOLDER`), so `activeOrgId` stays null and the page re-renders "Create your organization" while toasting "Organization created" ([authSlice.ts](client/src/store/authSlice.ts)). Only the `/auth/register` path works. *Fix:* after create, set the active persona to `ORG_ADMIN` and adopt the returned org id.

**B3. The documents "make little sense for real-world use."** (Your words, confirmed.)
Covered in full in **Part D**. This is the single most visible product-surface gap for a demo.

### 🟠 Credibility gaps

**B4. Domain verification is bypassed in the shipped config → the entire trust model is theatre.**
`DNS_DRIVER` is absent from both [render.yaml](render.yaml) and `server/.env.example`, so it defaults to `local`, and `LocalDnsService` returns `true` for **every** domain. Anyone can register an org claiming `google.com`, click Verify, receive a real RSA signing key, and issue "verified" anchored documents as Google. Compounding it: the founder's email domain is never checked against the claimed domain, and `domain` is globally unique so squatting `microsoft.com` **also permanently blocks** the real Microsoft with no dispute path. *Fix for demo:* ship with a believable verification step (either real DNS TXT against a domain you control, or an explicit "manual review" stub that's honest), and add a founder-email/domain correspondence check.

**B5. Recruiter can read every colleague's salary proof.**
`assertCanView` grants document read to `HR | ORG_ADMIN | RECRUITER` for *all* org documents, and `list()` hands a recruiter an unfiltered `{ organizationId }` query. A recruiter seat can open any employee's `SALARY_PROOF` and download the full credential (salt included). Per your recruiter definition this is wrong — a recruiter should see **only** applicants' granted documents. *Fix:* the one-PR leak fix in **Part E** (drop `RECRUITER` from the ambient allow-list).

**B6. Public hash-verify discloses salary to anyone who's seen the PDF.**
`/verify/hash/:hash` is public and returns `holderName` + every scalar in `contentJson` — including salary, and the hash is printed on the PDF footer. Anyone who ever sees the PDF gets permanent, unauthenticated read access to its contents. *Fix:* the public/private field split in **Part D** — the public view proves "genuine, unrevoked, issued by X" **without** disclosing salary/PAN/name.

**B7. The monetization model is internally broken in ways a DD reviewer will probe.**
- Subscriptions **never renew and never expire** — there is no renewal/expiry cron; a row stays `ACTIVE` forever past `currentPeriodEnd`, and `EXPIRED`/`PAST_DUE` are never written ([subscription.service.ts](server/src/modules/subscription/subscription.service.ts)).
- The advertised **"1,000 checks / month"** verifier quota is **enforced nowhere** — nothing counts checks; the only limit is 100 req/min in-memory, and each request can batch 100 hashes (~10,000 checks/min).
- **Verifier API keys outlive the subscription that gated them** — cancel your $49 plan and every minted key keeps working; the guard never re-checks the sub ([api-key.guard.ts](server/src/common/guards/api-key.guard.ts)).
- **The public `/verify/hash` is free**, so it's unclear what the paid verifier tier actually sells (only batching).
- One VERIFIER subscription can mint **unlimited keys**, each with its own 100/min bucket.
*Fix for demo:* you don't need real billing, but the pricing story must be coherent — decide what the paid tier sells (attributed/bulk verification), enforce a visible per-subscription quota counter, and auto-revoke keys on cancellation.

**B8. No password reset exists.** `PASSWORD_RESET` is a dead enum value; a user who sets a password and forgets it is permanently locked out of the password credential ([auth.service.ts](server/src/modules/auth/auth.service.ts)). Only relevant to the demo if you demo login recovery, but it's a glaring omission a reviewer may ask about.

**B9. The AI ranker is trained on synthetic random data.** The LightGBM model is fit on `rng.random((2000,6))` — a noisy approximation of six hardcoded weights, containing zero real-world signal ([ranking.py](ai-service/app/ranking.py)). The SHAP explanations are real math over a fake model. For a demo this is fine **if framed honestly** ("explainable ranking, weights tuned by hand pending training data"); presenting it as a learned model invites a question you can't answer. The `INTERESTED/NOT_INTERESTED` replies are the obvious training label and are currently captured and ignored — worth mentioning as the roadmap.

### 🟡 Fast-follows (business)

- Share links default to **no expiry / unlimited views** for a one-time $1.99 purchase; links created under Premium survive cancellation forever.
- Concurrent subscribe can **double-charge** (no existing-active check); no refund/proration path.
- Holder can **hard-delete a REVOKED document**, erasing the issuer's record of a policy violation ([document.service.ts](server/src/modules/document/document.service.ts)).
- No audit logging on the document lifecycle, payments, or security events despite the compliance positioning (only 3 audit write-sites exist platform-wide).
- Notifications dead-end (clicking one only marks it read; no navigation).
- `accountType` on registration is collected and **discarded**.
- Recommendation letters auto-assign "any active manager, most recently joined" when none is specified — meaningless for an LOR.

---

## Part C — Technical gap analysis

### 🔴 Demo-blockers

**C1. The "dual signature" is cryptographically vacuous.**
`sign()` computes `managerSignature = kms.sign(orgKey, documentHash)`; `approve()` computes `hrSignature = kms.sign(orgKey, documentHash)` — **same key, same input**, and Node's default RSA padding (PKCS#1 v1.5) is deterministic, so `managerSignature === hrSignature` byte-for-byte for every non-bulk document. Neither signature binds *who* signed, their *role*, or *when*. Separation of duties exists only as a DB row comparison, not in the cryptography. Since the trust story is the core value prop, this is the most important technical fix. *Fix options, cheapest → best:*
  1. **(Minimum)** Sign **distinct payloads** — e.g. manager signs `{documentHash, role:'MANAGER', memberId, signedAt}`, HR signs `{documentHash, role:'HR', memberId, approvedAt}`. Two different signatures that bind identity + role + time. Verification checks each. Still one org key, but now meaningful.
  2. **(Better)** Per-member signing keys (manager key ≠ HR key), so the two signatures are genuinely from two principals. Bind the member's public key / DID into the credential.

**C2. Freshly-issued → `INVALID`.** (Same as B1 — it's both a UX and a verification-logic bug.)

**C3. The PDF generator crashes on Indian names.**
[pdf-generation.service.ts](server/src/modules/document/pdf-generation.service.ts) uses `StandardFonts.Helvetica` (WinAnsi/Latin-1). Any Devanagari, Tamil, CJK, emoji, or even a curly quote throws `WinAnsiEncoding cannot encode`. India-first means this fires constantly — and because PDF generation runs **outside** the approve transaction and is unretryable, a throw leaves the document `ISSUED` with `renderedPdfUrl = null` and no repair path (C6). *Fix:* embed a Unicode TTF (e.g. Noto Sans) via `pdf-lib` + `fontkit`.

**C4. Sessions die at 15 minutes in the deployed topology.**
The refresh cookie is `sameSite: 'lax'` ([auth.controller.ts](server/src/modules/auth/auth.controller.ts)), but the client is cross-site (Vercel frontend, Render API) and sends `credentials: 'include'`. A `lax` cookie is not transmitted on cross-site XHR, so `POST /auth/refresh` arrives with no cookie and every session hard-expires at the 15-minute access-token TTL. A hosted demo becomes unusable mid-pitch. *Fix:* `sameSite: 'none'; secure: true`, and add CSRF defense on the two cookie-authenticated routes (refresh/logout) since `none` re-opens CSRF.

**C5. No server-side content validation.**
`SignDocumentDto.contentJson` is `@IsObject()` only ([sign-document.dto.ts](server/src/modules/document/dto/sign-document.dto.ts)) — a `SALARY_PROOF` can be signed and issued with `{}`. The field lists exist only in the client ([sign-config.ts](client/src/features/document/sign-config.ts)). Two of your entry paths (interactive vs bulk CSV) write **different, incompatible** shapes for the same type. *Fix:* per-type DTOs, detailed in **Part D**.

### 🟠 Credibility gaps

**C6. Issuance side effects run outside the transaction and are unretryable.** PDF generation and the Merkle post-anchor PDF stamp both run after their transactions commit, each `.catch()`-swallowed; a failure leaves an issued document permanently PDF-less with no repair endpoint (the state guard blocks re-running `approve`).

**C7. Every lifecycle transition is read-then-write with no atomic status guard.** Two concurrent `approve()` calls both pass `assertStatus('PENDING_HR')` and both issue. *Fix:* `updateMany({where:{id, status:'PENDING_HR'}})` and assert `count === 1`. Same pattern across sign/reject/revoke. The Merkle batch can also flip a `REVOKED` doc back to `ANCHORED` (no status precondition in the batch update).

**C8. GDPR erasure is incomplete — a real risk given the compliance positioning.**
`DocumentVersion.contentJson` (full historical snapshots) is **never scrubbed**; `VerifierApiKey` rows keep working after erasure (the API-key guard never checks the user's `gdprDeletedAt`); share links to the holder's documents stay live. The salt is nulled on *all* the holder's documents — including the issuer's own record, which a former employer may legally need. ([user.service.ts](server/src/modules/user/user.service.ts))

**C9. The mock adapters would fail in production, and one defaults dangerously.** `PAYMENT_DRIVER` defaults to `mock` ([env.validation.ts](server/src/config/env.validation.ts)); deploy without setting it and `POST /payments/mock/complete` lets any user self-serve free Premium/Enterprise subscriptions and free share links. `EMAIL_DRIVER=console` logs full magic-link URLs (live credentials) to stdout. Local KMS keys live on ephemeral container disk — a restart loses every org's signing key and invalidates all signatures. *For the demo:* fine if framed honestly, but set `PAYMENT_DRIVER` explicitly and mount a persistent disk for keys/storage.

**C10. Rate limiting and the API-key limiter are in-memory / per-process.** `REDIS_URL` is in the env and used nowhere; limits divide by instance count and reset on restart, and the API-key window map grows unbounded. Fine for a single-instance demo; a scaling story question for DD.

**C11. The exported "W3C Verifiable Credential" isn't interoperable.** Non-resolving `@context`, a bespoke `proof` type with no `verificationMethod`/`created`/`proofPurpose`, no issuer DID (the `rootDid` column is never populated), and a **double-nested `credentialSubject`** on the interactive path. *Important nuance (from crypto review):* the double-nesting does **not** break offline verification today — signing hashes `contentJson` verbatim and `buildCredential` sets `credentialSubject: doc.contentJson`, so the recompute matches. It's an *idiomatic-shape* and *two-writers-diverge* problem, not a broken hash. Fix it cosmetically and **forward-only** (never rehash historical docs). See Part D.

### 🟡 Fast-follows (technical)

- No `helmet`/security headers; Swagger served unauthenticated in production ([main.ts](server/src/main.ts)).
- Refresh-token reuse doesn't revoke the token family (10s replay window, no alert).
- Password change/set doesn't revoke other sessions.
- `HttpExceptionFilter` leaks raw error messages (Prisma constraint details) on 500s.
- Bulk issuance runs in-process fire-and-forget; a restart mid-batch strands the batch in `PROCESSING` forever.
- pgvector search has **no ANN index** (sequential scan, exact KNN, O(n) per search); `LIMIT 30` on documents then dedup-per-holder can starve results to a single candidate.
- Cross-org skill leak in the recruiter `listMatches` endpoint (aggregates skills across all orgs, unlike `search` which scopes correctly).
- Full document text (potentially salary) is POSTed to Groq's US API for skill extraction with no sub-processor disclosure in the consent copy.
- Zero test coverage on auth, org-scoping, the document lifecycle, and the entire AI/recruiter stack, despite the project's own CLAUDE.md mandating those tests.

---

## Part D — India-first document redesign (your priority)

**Design principles applied throughout:**
- **Simplest default + progressive disclosure.** Each type shows 3–6 fields by default (most auto-filled), with a collapsed "Add more detail" for the rest. No 40-field wall.
- **Server is the source of truth.** Per-type `class-validator` DTOs replace the `@IsObject()` hole; `sign-config.ts` becomes a *projection* of that schema for form rendering, not the schema itself. The **same validator runs on the interactive path and the bulk CSV path**, so they can no longer diverge.
- **Canonicalization-safe by construction.** Money is **integer minor units (paise)**, never floats or coerced strings; dates are ISO `YYYY-MM-DD`; the subject is **flat, single-level**; absent optional fields are **omitted, never `null`/`""`/`[]`**.
- **Forward-only migration.** Historical documents keep their frozen `documentHash`; new issuance writes a `schemaVersion`ed flat subject. Never rehash old docs.

### D0. The one foundational crypto fix that makes everything else real

> Surfaced by the adversarial crypto review, and it corrects a subtle assumption: **the hash is computed over the raw `dto.contentJson` from the request** (`hashDocument(dto.contentJson, salt)`), **not** over the validated/normalized DTO instance.

Consequence: `whitelist`/`forbidNonWhitelisted`/"omit-when-empty" protect a transformed object you then **throw away**. A client that sends `duesSettled: null` or `keyStrengths: []` passes `@IsOptional()`, and those exact bytes flow into the signed hash — so the determinism guarantee is *asserted but not wired*.

**Fix (do this first, it underpins all three schemas):** in `sign()`, `validate → instanceToPlain → strip undefined/null/empty-array/empty-string → store THAT normalized object as `contentJson` and hash IT`. After this, the validated object, the stored object, the hashed bytes, and the credential's `credentialSubject` are all the same bytes. This single change fixes the null-key hazard and the shape drift at once.

Also: recompute server-authored fields (salary gross/net; derived tenure is render-only) and **overwrite** before hashing — never sign client-supplied totals even when they happen to match.

### D1. Experience / Relieving Letter (`EXPERIENCE_LETTER`)

**Real-world framing.** In India an *experience/service certificate* certifies employment (for visas, loans, BGV) and can be issued to current or former staff; a *relieving letter* is issued only on separation and confirms notice served and dues settled (the next employer demands it). Most companies issue a combined **experience-cum-relieving** letter at exit. → Model **one type discriminated by `letterKind`** (`EXPERIENCE | RELIEVING | EXPERIENCE_CUM_RELIEVING`); the only real difference is a separation block that's required when `letterKind ≠ EXPERIENCE`.

**Default-visible fields (5):** `letterKind` (segmented control, default *Experience*), `designation` (pre-filled), `dateOfJoining`, `lastWorkingDay` (hidden behind a "Still employed" toggle), `conductSummary` (textarea pre-seeded with an India-standard template into which name/dates/tenure are interpolated). Selecting *Relieving/Both* auto-promotes the separation block.

**Auto-filled (never retyped):** `employeeName`, `employeeCode`, `employmentType` (default `FULL_TIME`), `department`, `reportingManager`, `workLocation`, `signatoryName`/`signatoryDesignation` (from the signing member), issuer identity + `placeOfIssue`, `issueDate`.

**Signed `credentialSubject` (flat) — required + common optional:**
`schemaVersion`, `letterKind`, `employeeName`, `employeeCode`, `designation`, `employmentType`, `dateOfJoining`, `lastWorkingDay`* , `conductSummary`, `signatoryName`, `signatoryDesignation`, `issueDate`, `referenceNumber`; optional: `department`, `reasonForLeaving`*, `noticePeriodServed`, `duesSettled`, `workLocation`, `reportingManager`, `placeOfIssue`. (*conditional on separation.)

**Enums:** `letterKind` {EXPERIENCE, RELIEVING, EXPERIENCE_CUM_RELIEVING}; `employmentType` {FULL_TIME, CONTRACT, INTERN, CONSULTANT}; `reasonForLeaving` {RESIGNATION, TERMINATION, MUTUAL_SEPARATION, CONTRACT_END, RETIREMENT}; `noticePeriodServed` {SERVED_IN_FULL, WAIVED, SHORTFALL_RECOVERED, PAY_IN_LIEU}.

**Two corrections from the domain review — apply these:**
- **Add `issueDate` and `referenceNumber` to the signed subject** (e.g. `Ref: HR/REL/2024-25/0421`). Real Indian letters always carry a letter number and printed date; the envelope `issuanceDate` is *not* covered by the hash, so these must live inside `credentialSubject`.
- **Drop `rehireEligible` and pull `reasonForLeaving` off the public view; reconsider signing `TERMINATION`/`NOT_ELIGIBLE` at all.** No Indian HR prints "not eligible for rehire / terminated" on the *employee's own* copy — rehire eligibility is confidential back-channel BGV data. Broadcasting it to anyone holding the hash is the fastest way to lose the HR person in your audience, and is arguably defamatory. (Also: `CONSULTANT`/`CONTRACT` don't take "relieved of duties / notice period / PF" — a consultant gets a service-completion certificate; keep the separation language for employees only.)
- `duesSettled: true` dated the last-working-day is often factually premature (full-and-final closes 30–45 days later) — keep it optional.

**Issuer identity stays on the org, not the subject:** legal entity name + **CIN** (21-char) + optional GSTIN + registered address + letterhead. Extend the org `select` in `buildCredential` and put these in the VC `issuer` block.

### D2. Salary / Income Certificate (`SALARY_PROOF`) — the strongest redesign

**Real-world framing.** What a bank / landlord / visa desk actually asks for: a **CTC breakdown** where earnings reconcile to gross and statutory deductions reconcile to net, with pay period, frequency, and a named signatory. The current single-`annualSalary`-string fails all three audiences.

**The reconciliation invariant (the crux):** `gross = Σ earnings`, `net = gross − Σ deductions`, all in **integer paise** so an offline verifier can re-check byte-for-byte. The server is the **sole author** of `grossEarningsPaise`/`totalDeductionsPaise`/`netPayPaise` — recompute → overwrite → hash.

**Default-visible fields (6, on top of a pre-filled identity block):** pay-period (month picker → `periodStart`/`periodEnd`), `basic`, `hra`, `specialAllowance`, `pfEmployee`, `incomeTaxTds`. A live **Gross ₹… · Deductions ₹… · Net ₹…** readout (Indian digit grouping) updates as they type.

**Auto-filled:** identity (`employeeName`, `employeeCode`, `dateOfJoining`, masked PAN, UAN), role (`designation`, `department`, `employmentType`, `employmentStatus`, `workLocation`), signatory, and server-derived (`currency:"INR"`, `minorUnit:"paise"`, `schemaVersion`, `issueDate`, `professionalTax` from the work-state slab, and the three totals).

**Progressive disclosure:** `lta`, `conveyanceAllowance`, `medicalAllowance`, `variablePay`, `esiEmployee`, `loanRecovery`, `otherDeductions`, `employerPf`, `gratuity`, `annualCtc`, `grade`, `referenceNumber`, `purpose`, `remarks`. (`employerPf`/`gratuity`/`annualCtc` are CTC-side and **excluded** from the gross sum.)

**Public/private split (this is the model the other two should imitate):**
- **Public `/verify/hash`:** type, issuer name/domain, issue/expiry dates, `employmentStatus`, verdict, optionally `designation`/`department`. Reads as *"This hash is a SALARY_PROOF issued by TechCraft Pvt Ltd on 2025-08-04, currently ISSUED, signatures valid, anchored"* — **no name, no money**.
- **Private (full credential only, holder-shared):** every `*Paise`, `panMasked`, `uanNumber`, `employeeName`, `employeeCode`.

**India specifics to get right (domain review):**
- **Professional Tax is ₹0 in several states** (Haryana, Delhi, UP, Uttarakhand). Auto-derive must return 0 there, handle Maharashtra's ₹300-in-February quirk and the ₹2,500 annual cap — not stamp ₹200 everywhere (which breaks reconciliation).
- **Masked PAN vs loan desks:** masking is the right privacy call, but a conservative home-loan officer may want the full PAN to cross-match Form 16 / 26AS. Call this tension out in the demo rather than letting a fintech reviewer assume you missed it.
- **`rupees × 100` is a float hazard** (`19.99 * 100 = 1998.9999…`). Parse the rupee input as a decimal string and round-half-up to integer paise.
- **`specialAllowance` as a manual balancing bucket is the friction point** — consider letting the signer enter gross and auto-deriving special, or auto-balancing special to a target gross.

### D3. Letter of Recommendation (`LETTER_OF_RECOMMENDATION`)

**The core fix:** today the signature binds only the *organisation* — the crypto attests "*some* employee vouches," never *who*. Put the recommender **inside `credentialSubject`** (`recommenderName`, `recommenderTitle`, `recommenderEmail`, `relationshipType`, `organizationContext`), auto-filled from the signing member's profile, so the signature binds the person vouching. LORs never expire (`expiresAt = null`).

**Default-visible fields (3–4, the best-tuned of the three):** `candidateName` (pre-filled), `relationshipType` (plain-language select: "Their reporting manager", "A peer", "Their research guide"…), `relationshipStartDate` (renders "3 yrs" beside it), `overallAssessment` (the one big textarea). A read-only **"Signing as"** block shows the auto-filled recommender identity above the form.

**Progressive disclosure:** `endorsementStrength` (default `STRONGLY_RECOMMEND`), `recommendationContext`, `keyStrengths` (chips, ≤6), `notableProjects` (`{title, candidateRole, impact}`, ≤3), `candidateTitle`, `relationshipEndDate`, reference-check contact (phone / profile URL — flagged private).

**Enums:** `relationshipType` {DIRECT_SUPERVISOR, SKIP_LEVEL, DEPARTMENT_HEAD, PEER, CROSS_FUNCTIONAL, MENTOR, CLIENT, VENDOR_PARTNER, PROFESSOR, RESEARCH_GUIDE}; `endorsementStrength` {STRONGLY_RECOMMEND, RECOMMEND, RECOMMEND_WITH_RESERVATIONS}; `recommendationContext` {HIGHER_EDUCATION, EMPLOYMENT, INTERNAL_PROMOTION, IMMIGRATION_VISA, SCHOLARSHIP_FELLOWSHIP, PROFESSIONAL_MEMBERSHIP, GENERAL}.

**Public/private:** substance is public (who vouches, capacity, the endorsement); contact PII (`recommenderEmail`/`recommenderPhone`/`candidateEmail`/`recommenderProfileUrl`) withheld from the anonymous view. Keep **LOR interactive-only** (no bulk CSV — a CSV of recommendations makes no real-world sense). *Soft credibility note:* `@IsEmail()` accepts `gmail.com`, which is worthless to a visa officer; consider flagging/requiring an institutional-domain recommender email.

### D4. Server-validation wiring (shared by all three + bulk)

```ts
// One discriminated validator, used by BOTH the interactive sign path and each bulk CSV row.
const SUBJECT_DTOS = {
  EXPERIENCE_LETTER: ExperienceLetterSubjectDto,
  SALARY_PROOF: SalaryProofSubjectDto,
  LETTER_OF_RECOMMENDATION: LetterOfRecommendationSubjectDto,
} as const;

async function normalizeAndValidateSubject(type, contentJson) {
  const dto = plainToInstance(SUBJECT_DTOS[type], contentJson);
  await validateOrReject(dto, { whitelist: true, forbidNonWhitelisted: true });
  // D0: hash THIS, not the raw request body.
  return stripEmpty(instanceToPlain(dto)); // drop undefined/null/''/[]
}
```

Then in `sign()`: `const subject = await normalizeAndValidateSubject(doc.type, dto.contentJson);` → store `subject` as `contentJson` → `hashDocument(subject, salt)`. This closes C5, wires D0, and converges the two entry paths onto one flat schema. Fix the `buildCredential` double-nesting cosmetically at the same time (store the flat subject directly; drop the `credentialSubject` wrapper on the interactive path), **forward-only**.

Full field tables, JSON-LD samples, and complete DTO source for all three types are captured in the design working files under the session scratchpad if you want to lift them verbatim into code.

---

## Part E — Recruiter application + document-access grant model

Your definition: an **internal hiring member** who sees **public candidate profiles** and **applicants' documents only as granted**. Two consequences.

**E1. The corrected access rule (ship first — one PR, no new tables).**
Drop `RECRUITER` from the ambient allow-list in `assertCanView` and from the `orgRoles` bundle + org-wide push in `list()` ([document.service.ts](server/src/modules/document/document.service.ts)). A recruiter gets **zero** ambient document access; they read a document only via an explicit grant. This alone closes B5/"recruiter reads colleague salaries."

**E2. Two disjoint universes:**
- **Discovery (pseudonymous).** Recruiter sees the opt-in discoverable talent market — skills, seniority, years, industries, match score + SHAP, and a **pseudonymous handle** (not a real name, employer, or document). *Correction from review:* use a **per-(recruiter, opening) salted handle**, not a stable `Candidate-<uuid[:4]>` — a stable handle plus niche skills re-identifies people across listings.
- **Documents (consent-gated).** Real signed documents are visible **only** when the candidate applied to this recruiter's opening and issued a per-document grant (time-boxed, view-capped, revocable, addressed to that recruiter).

**E3. The flow:** opt-in → pseudonymous discovery → **wire the currently-dead `TALENT_MATCH` notification** ("a role matches you — apply to share your verified docs") → candidate **applies** (reveals real name by choice, grants selected documents) → `APPLICATION_RECEIVED` to recruiter → recruiter views through the existing verified read path → **view receipt** to the holder (reuse the `LINK_VIEWED` pattern) → candidate can revoke a grant or withdraw the application.

**E4. POC-simplest implementation:** reuse `SharedLink` as the consent token. The candidate's **Apply** creates, per selected document, a `SharedLink` (`isPaid:true` to bypass the holder paywall, `expiresAt: now+30d`) delivered into the recruiter's inbox; the recruiter views via the existing `verifyByToken` path, which already recomputes the hash, verifies signatures, counts the view, and notifies the holder. Revoke = existing `deactivate()`. **This demonstrates the whole story — opt-in → apply → crypto-verified read → view receipt → one-click revoke — with almost no new read-path code.**

**E5. Fast-follow (fuller build):** replace the anonymous token with a grantee-bound `DocumentAccessGrant` + `Application` model (named grantee, application lifecycle `SUBMITTED→VIEWED→SHORTLISTED/REJECTED/WITHDRAWN`, first-class audit, addressed receipts). Schema sketch is in the design working files.

**E6. Honesty guardrail (privacy reviewers will pounce):** grant revocation stops *future* reads; it does **not** retract an already-downloaded credential — that file verifies forever, offline. For salary specifically, gate the recruiter behind a **view-only/watermarked render** rather than the downloadable offline bundle, and say plainly in the demo that revoke = no new access, not exfiltration recall. Also reframe `SAME_ORG`: discovery should scan the discoverable *market* (hiring is external), with `SAME_ORG` kept only as an explicit internal-mobility mode — today's default silently ships the wrong universe.

---

## Part F — Prioritized POC readiness plan

Sequenced for an **investor demo where the crypto trust story must survive scrutiny.** Rough effort in engineer-days; assume one strong full-stack dev.

### Critical for POC success (do these — the demo breaks or the story collapses without them)

| # | Fix | Why it's critical for the demo | Effort |
|---|---|---|---|
| 1 | **Make the dual signature real** (C1) — sign distinct role/identity/time-bound payloads (min) or per-member keys (better) | The pitch is "cryptographically dual-approved." Right now it's one signature stored twice — the first thing a technical DD reviewer will notice. | 1–2d |
| 2 | **Fix the `VERIFIED_PENDING_ANCHOR` verdict** (B1/C2) + a manual "anchor now" | Otherwise you issue a document on stage and it verifies as INVALID. | 0.5–1d |
| 3 | **India-first document redesign + server validation** (Part D, incl. the D0 hash-the-normalized-subject fix) | The documents are the product surface investors see, and today they're empty-able and unrealistic. This is your explicit priority. | 4–6d |
| 4 | **Unicode PDF font** (C3) | Indian names crash issuance; without this the demo can't render a real document. | 0.5d |
| 5 | **Cross-site session fix** (C4) — `sameSite:none; secure; + CSRF on refresh/logout` | A hosted demo dies at 15 minutes otherwise. | 0.5d |
| 6 | **Recruiter leak fix + POC grant flow** (E1/E4) | Your recruiter model; also closes "recruiter reads colleague salaries." The share-link-reuse path is cheap and demos the trust story beautifully. | 2–3d |
| 7 | **Public/private verify split** (B6/D2) | Lets you demo "verify authenticity **without** exposing salary" — a strong privacy beat. | 1d |
| 8 | **Honest, coherent DNS + payment story** (B4/C9) — real TXT against a domain you own (or an explicit manual-review stub), founder-email/domain check, `PAYMENT_DRIVER` set explicitly, persistent disk for keys | Removes the "anyone can issue as Google" and "mock money defaults on" landmines from any live scrutiny. | 1–2d |
| 9 | **Org-creation persona fix** (B2) | A visible broken happy-path if you demo org onboarding. | 0.5d |
| 10 | **Coherent monetization narrative** (B7) — decide what the paid verifier tier sells, show a quota counter, auto-revoke keys on cancel | The business model is part of the pitch; the current one contradicts itself. | 1–2d |

**Critical-path total: ~2.5–3.5 weeks.**

### Fast-follows / nice-to-haves (real for a pilot MVP; safe to defer past the demo)

- **Security hardening:** `helmet` + headers, gate Swagger, refresh-token family revocation on reuse, revoke sessions on password change, stop leaking raw error messages, per-email rate limiting.
- **GDPR completeness** (C8): scrub `DocumentVersion`, kill API keys + share links on erasure, reconsider nulling the issuer's salt.
- **Production adapters:** real KMS (per-org keys), real blockchain anchoring (the `AnchorRegistry` contract is ready but never called from the server), S3 storage, SES email, Stripe with idempotent webhooks + a renewal/expiry cron + entitlement-on-cancel.
- **Concurrency:** atomic status-guarded transitions (C7), move bulk issuance + Merkle to a real queue (Redis/BullMQ — `REDIS_URL` is already in env, used nowhere), per-org Merkle batches.
- **AI:** train the ranker on the captured `INTERESTED/NOT_INTERESTED` signal (or relabel it a hand-tuned heuristic and stop calling it learned), add a pgvector ANN index, fix the cross-org skill leak in `listMatches`, add PII redaction / sub-processor disclosure for the Groq call, fix the `LIMIT 30` candidate-starvation.
- **Full recruiter grant model** (E5): `DocumentAccessGrant` + `Application`, view-only salary render (E6).
- **Audit logging** across the document lifecycle + payments + security events (the compliance positioning currently has almost none).
- **Password reset flow** (B8); last-admin guard + member reactivation; domain dispute/release path.
- **Docs reconciliation:** the design docs describe three incompatible state machines, two smart contracts, and two hash definitions — pick one canonical spec and align README's PDF-resilience claim with reality before anyone reads them in DD. (See appendix.)
- **Accessibility:** tablist/tabpanel wiring, missing `<h1>`s, off-scale text sizes.
- **Tests:** at minimum the org-scoping 403, the sign→verify roundtrip, the consent gate, and a lifecycle-transition test — the project's own rules mandate them and none exist.

### A note on the demo narrative itself

Your strongest, most defensible story arc for the pitch:
1. **Issue** a realistic India salary certificate (CTC broken down, reconciling) — shows the product is real.
2. **Verify** it publicly by hash — green, six checks, **without** exposing the salary (privacy beat).
3. **A candidate applies** to a recruiter and grants one document — recruiter verifies the crypto themselves, holder gets a view receipt (consent beat).
4. **Revoke** — future access gone (and be honest about what revoke does and doesn't do).
5. **Tamper** with one character — verification goes red (the tamper-evidence beat).

Every item in the Critical list above exists to make one of those five beats land without an asterisk you can't defend.

---

## Appendix — documentation-vs-code contradictions (for DD hygiene)

The `documentation/` design docs (March 2026) predate the June 2026 feature set and describe a more ambitious, internally-inconsistent system:
- **Three incompatible document state machines** across the three design docs vs the 7-state code enum.
- **Two different smart contracts** — one (`MerkleRootRegistry`) has *no revocation function at all*, making on-chain revocation (a headline rule) impossible under that spec.
- **Two leaf-hash definitions** — one omits the salt, which would collapse the entire GDPR "dead-hash" mechanism.
- **README contradicts the docs' core resilience claim:** docs say "verify from the PDF's embedded proof even if CareerVault disappears"; README says the PDF intentionally carries no JSON-LD/salt and must not be relied on. The "10-line script, works offline" pitch is only true via the `/credential` endpoint, not the PDF alone.
- Promised-but-absent: IPFS/GitHub transparency mirror, GDPR data-export ZIP, Stripe usage metering, org SUSPENDED state, HashiCorp Vault signing, manager-email allowlist, an SRS the README references but that doesn't exist.
- The entire recruiter/AI/verifier-key/bulk-issuance surface exists in code but appears in **none** of the design docs.

Pick one canonical spec, align it with the code, and retire the rest before an investor's technical advisor reads them side-by-side.

---

## Part G — Implementation record (2026-08-10)

Everything in the Critical list and the Fast-follows list was implemented. This section records
what changed, why, and how each item was **verified** — not merely asserted.

### Verification gates (all green)
| Gate | Result |
|---|---|
| `server: tsc --noEmit` | clean (0 errors) |
| `server: npm test` | **30 passing** (was 8) |
| `server: nest build` | clean |
| `client: tsc -b --noEmit` | clean |
| `client: npm run build` | clean |
| `client: npm run lint` | clean (0 warnings) |
| Runtime smoke (HTTP, seeded data) | full pipeline + privacy + cascade **passing** |

### Critical items — what changed

**C1 — the dual signature is now real.** Manager and HR no longer sign the bare document hash
(which produced two byte-identical RS256 signatures under deterministic padding). Each signs a
distinct statement `SHA-256(JCS({v:1, documentHash, role, memberId}))` binding their role and
membership; verification recomputes both from the stored signer/approver ids.
*Verified:* runtime credential shows two different signatures; 4 unit tests assert the statement
differs per role, per member, and per document.

**D0/Part D — India-first content, server-enforced.** Three per-type `class-validator` DTOs
(experience/relieving letter discriminated by `letterKind`; salary certificate with a reconciling
CTC breakdown; recommender-bound LOR). The server validates → normalizes (dropping empty values so
the signed bytes are deterministic) → stores the **flat** subject → hashes *that*, and injects
`schemaVersion` / `issueDate` / `referenceNumber`. Salary gross/deductions/net are **server-authored**
in integer paise. The bulk-CSV path now runs through the *same* validator, so the two entry paths
can no longer diverge; bulk salary certificates are refused (a CSV column cannot express a CTC
breakdown). *Verified:* empty `{}` → 422; 14 unit tests; runtime reconciliation exact.

**B1 — `VERIFIED_PENDING_ANCHOR`.** A correctly issued document is no longer reported `INVALID`
while it waits for the daily Merkle batch. *Verified:* runtime verdict transitions
pending-anchor → `VERIFIED` after anchoring.

**B6/D2 — public/private disclosure split.** Anonymous `/verify/hash/:hash` returns a per-type
allow-list only; a salary lookup withholds every `*Paise`, PAN, UAN, employee code **and the
holder's name**, while still proving issuance/signatures/anchor. A holder-shared link opts into
full disclosure for that document. *Verified:* runtime public lookup exposes only role-level fields.

**E1 — recruiter leak closed.** `RECRUITER` removed from ambient document access in both
`assertCanView` and `list()`; recruiters read candidate documents only via consent-gated links.

**C3 — Unicode PDFs.** Noto Sans + Noto Sans Devanagari embedded via `@pdf-lib/fontkit`, with
per-run glyph-coverage fallback and real word-wrap (replacing a 60-char truncation).
*Verified:* runtime PDF with a Devanagari name, ₹, curly quotes and a long body renders without error.

**C4 — cross-site sessions + CSRF.** Refresh cookie is `sameSite:none; secure` in production
(it was `lax`, so sessions died at 15 minutes in the deployed split-origin topology), with a
double-submit `cv_csrf` token enforced on the two cookie-authenticated routes.

**B4/C9 — honest trust + payment config.** Founding an org now requires the founder's email domain
to match the claimed domain (anti-squatting); `DNS_DRIVER` is explicit in `render.yaml`/`.env.example`;
production boot prints a loud warning when any integration is still on a mock driver.

**B2 — org-creation dead-end fixed.** Founding an org from a holder persona now adopts the new
`ORG_ADMIN` persona and lands on Org Settings instead of re-rendering the create form.

**B7 — coherent monetization.** Verifier API keys now require a *live* subscription of the matching
tier on every request (they previously outlived cancellation forever), enforce a real monthly quota
(migration `verifier_key_usage`), and are revoked when a subscription is cancelled. Marketing copy
and enforced numbers were reconciled to the same unit.

### Fast-follows — what changed

- **Security headers:** `helmet` (HSTS, nosniff, frameguard; CSP/COEP disabled as inappropriate for
  a cross-site JSON API), Swagger gated to non-production, and raw `Error.message` no longer returned
  on 500s (generic message to the client, real error logged server-side).
- **Auth:** refresh-token reuse outside the 10 s race window now **revokes the whole token family**;
  password set/change/reset revokes all sessions; per-email rate limits added alongside per-IP;
  and a complete **password-reset flow** was built (it did not exist — forgotten passwords were
  unrecoverable), using single-use, purpose-checked, 15-minute magic links with no user enumeration.
- **GDPR erasure completeness:** `DocumentVersion.contentJson` is now scrubbed (full PII copies
  previously survived erasure — the clearest Art. 17 failure), verifier API keys are revoked, and
  share links to the holder's documents are deactivated — all inside the existing transaction.
- **Reliability:** a daily job expires lapsed subscriptions (`ACTIVE` rows previously stayed active
  forever past `currentPeriodEnd`) and revokes the keys of users left with no active plan.
  *Stripe renewal remains out of scope pending real credentials.*
- **Concurrency:** every lifecycle transition (`sign`/`approve`/`reject`/`revoke`) is now a
  status-guarded `updateMany` that fails closed on a lost race, instead of read-then-write; and the
  Merkle batch can no longer silently flip a concurrently-revoked document back to `ANCHORED`.
- **Revocation side effects:** revoking a document now deactivates its share links — previously a
  revoked document kept circulating to anyone holding the URL. *Verified at runtime:* a live paid
  link resolves before revocation and returns `NOT_FOUND` immediately after.
- **Audit trail:** `sign` / `approve` / `reject` / `revoke` now write audit rows (COMPLIANCE tier for
  issuance and revocation, STANDARD for rejection) with actor, reason and member ids.
  *Verified at runtime* through the audit API.
- **Org governance:** a last-admin guard blocks removing (or GDPR-deleting) the only active
  `ORG_ADMIN`, which previously orphaned an organization permanently with no recovery path; and
  re-inviting a deactivated member now reactivates them instead of failing forever on the unique
  constraint.
- **AI/recruiter:** cross-org skill leak in `listMatches` closed, candidate starvation from the
  document-level `LIMIT 30` fixed, a pgvector ANN index added, the payload sent to the third-party
  LLM reduced to an explicit skill-relevant allow-list (salary/PAN/UAN/identifiers no longer leave
  the platform), and the ranker's reported version made honest about being a hand-tuned heuristic
  rather than a trained model.
- **Accessibility:** invalid `role="note"` replaced with tone-appropriate `alert`/`status`; missing
  page-level `h1`s added; arbitrary `text-[10px]` replaced with the type-scale token; and heading
  levels made monotonic across all four states (the real defect was 17 `QueryBoundary` error states
  with no way to set a level — two audit items were disproved on inspection and correctly left alone).
- **Tests:** the suite went from 8 to **30**, now covering content validation (empty content,
  unknown keys, conditional separation fields, salary reconciliation, PAN format, deterministic
  normalization), the dual-signature statement scheme, and reference-number generation.
- **Docs:** the README now documents the real dual-signature scheme, server-side content validation,
  and the public/private verification split, and explicitly supersedes the stale design-doc claim
  that a PDF alone is independently verifiable.

### Still deferred (deliberately)

| Item | Why |
|---|---|
| Real cloud adapters (AWS KMS/S3/SES, live Stripe, Polygon RPC) | Require credentials that don't exist in this environment. Writing unverifiable cloud SDK code is a liability; the adapter seams are already in place, and the deploy now warns loudly when a mock driver is active in production. |
| Stripe subscription **renewal** | Same reason. The expiry side is implemented; renewal must come from real webhooks. |
| Full `DocumentAccessGrant` / `Application` model | The leak it was meant to fix is already closed, and share links serve as the POC grant path. This is a multi-table feature better scoped as its own piece of work. |
| Backfilling historical documents to the new schema | Deliberate: re-hashing already-signed documents would invalidate their frozen signatures and anchors. New issuance is versioned (`schemaVersion`), so old and new coexist. |
