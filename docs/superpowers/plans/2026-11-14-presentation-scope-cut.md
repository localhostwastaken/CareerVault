# Presentation Scope Cut, Polish and Demo Recording — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut CareerVault to its core story, fix what the camera would catch, reseed production with showcase data, and produce one continuous scripted demo recording plus a talk track.

**Architecture:** Frontend deletions and small fixes in `client/`. One server behaviour change (free share links). A seed extension plus a Nest-application-context "showcase" script that drives the real services, so issued and anchored documents exist without anyone typing a password. A new `demo-recording/` Playwright package that runs a headed take while ffmpeg captures the screen.

**Tech Stack:** React 19 + RTK Query + Vitest (client); NestJS 11 + Prisma 7 + Jest (server); Playwright + ffmpeg `avfoundation` (recording).

**Spec:** `docs/superpowers/specs/2026-11-14-presentation-scope-cut-design.md`

## Global Constraints

- Production URL: `https://career-vault-steel.vercel.app`; API `https://careervault-fsov.onrender.com/api/v1`.
- Alice's email: `imperialsample+alice@gmail.com`. Gmail account shown on camera: `imperialsample@gmail.com`.
- Step-up values stay the public demo values: DOB `1990-01-15`, ID `DEMO-0001`, answers `Somaiya` / `Mumbai` / `Bruno`.
- Claude never types a production password. The production take reads `DEMO_PASSWORD` from the environment and is launched by a team member.
- Commits: no `Co-Authored-By` or "Generated with Claude" lines.
- Server rules in `server/CLAUDE.md` (ESM `.js` imports, services ≤ ~200 lines, no `any`). Client rules in `client/Claude.md`. Lucide icons only.
- After code changes, run `graphify update .` from the repo root.
- No claude.ai Artifacts. The talk track is a local HTML file.

## Review Focus

1. **Sign out as A, sign in as B in the same tab:** B must never see A's documents, notifications or bell count. (Task 4 test.)
2. **Share link for a non-premium holder:** created active at once, with no `/payments/mock` redirect and no "$1.99" copy. (Tasks 1 and 2 tests.)
3. **Direct URL to a cut route** (`/app/billing`, `/app/verifier-api`, `/payments/mock`, `/demo/sha256`): lands on the role home or the landing page, not a blank or "Coming soon" screen. (Task 3 verification.)
4. **Recommendation letter** (no reference number) in the wallet and in Issued lists: no hash fragment is shown. (Task 5 test.)
5. **Render cold start or Supabase paused at take time:** the recorder refuses to start recording and prints why, instead of recording a spinner. (Task 8 preflight test.)

---

### Task 1: Free share links (server)

**Files:**
- Modify: `server/src/modules/share-link/share-link.service.ts` (`create`, constructor, header comment)
- Modify: `server/src/modules/share-link/share-link.module.ts` (drop the `PaymentsModule` import if nothing else needs it)
- Create: `server/src/modules/share-link/share-link.service.spec.ts`

**Interfaces:**
- Produces: `ShareLinkService.create(user, dto): Promise<{ shareLink: PublicShareLink; checkout: null }>`. The `checkout` key stays (always `null`) so the client type remains compatible.

- [ ] **Step 1: Write the failing test** `share-link.service.spec.ts` in the style of `document-revoke.spec.ts` (hand-rolled Prisma fake):
  - `it('creates an active link for a holder with no subscription, without opening a payment')`: the fake `subscription.findFirst` returns `null`, and `payment.create` throws if called. Assert the result has `checkout === null`, `shareLink.isActive === true` and `shareLink.isPaid === true`, and that `sharedLink.create` received `isActive: true`.
  - `it('still refuses a document that is not issued')`: status `PENDING_HR` → `UnprocessableEntityException`.
- [ ] **Step 2: Run** `cd server && npx jest src/modules/share-link` and expect the first test to FAIL (the paid path calls payments).
- [ ] **Step 3: Implement.** `create` always takes the current premium branch. Remove `hasActivePremium`, the payment transaction, the `PaymentsService` dependency and `ONE_TIME_LINK_PRICE` usage. The header comment says share links are free (scope decision 2026-11-14, billing is future scope per `SCOPE.md`). Leave `share-link.cron.ts` as is; it purges nothing new.
- [ ] **Step 4: Run** `npx jest src/modules/share-link && npx tsc --noEmit -p tsconfig.json` and expect PASS.
- [ ] **Step 5: Commit** `feat(share-link): share links are free; payment gate removed`.

### Task 2: Share-link dialog without checkout (client)

**Files:**
- Modify: `client/src/features/share-link/components/CreateShareLinkDialog.tsx`
- Modify: `client/src/features/share-link/types.ts` (drop `CheckoutInfo`; `checkout: null`)
- Modify: `client/src/pages/Holder/ShareLinks.tsx` (drop the return-from-checkout handling)
- Modify: `e2e/specs/document-lifecycle.spec.ts:140-147` (no checkout step)

**Interfaces:**
- Consumes: Task 1's response shape.

- [ ] **Step 1: Update the e2e spec first.** After `Continue`, expect to stay on `/app/share-links` and see the new link. Delete the `/payments/mock` wait and the `Pay` click.
- [ ] **Step 2: Implement.** The dialog description says links are free and can be deactivated any time. The success path is the one the premium path uses today. Remove every `checkout` branch and the router state for `amountDollars`.
- [ ] **Step 3: Verify** with `cd client && npx tsc -b && npx eslint src/features/share-link src/pages/Holder/ShareLinks.tsx`. Expect no errors, and `grep -rn "1.99\|checkout" client/src/features/share-link client/src/pages/Holder` returns nothing.
- [ ] **Step 4: Commit** `feat(client): share links are created free, no checkout step`.

### Task 3: Remove billing, checkout, Verifier API and SHA-256 lab; hide /demo

**Files:**
- Delete: `client/src/pages/Holder/Billing.tsx`, `client/src/pages/Holder/VerifierApi.tsx`, `client/src/pages/Payments/`, `client/src/pages/Demo/Sha256Visualizer.tsx`
- Delete: `client/src/features/subscription/`, `client/src/features/payment/`, `client/src/features/verifier-key/`, `client/src/features/sha256-lab/`, `client/src/features/demo/components/Sha256LabCard.tsx`
- Modify: `client/src/routes.tsx` (imports, `IMPLEMENTED` keys `billing` and `verifier-api`, the `/demo/sha256` route, the `/payments/mock` route block)
- Modify: `client/src/lib/roles.ts` (HOLDER nav: drop Billing and Verifier API; drop now-unused icons)
- Modify: `client/src/features/demo/demoSteps.ts` (drop the SHA-256 step), `client/src/pages/Demo/DemoGuide.tsx` (drop the lab card)
- Modify: `client/src/layouts/PublicLayout.tsx` (drop both "Demo guide" links), `client/src/layouts/PortalLayout.tsx:75` (drop the `/demo` menu item)
- Modify: `client/src/apis/APISlice.ts` tag types, if any tags belong only to deleted features

- [ ] **Step 1: Delete and edit** as listed. `/demo` stays a registered route (reachable only by URL). Any feature-route key that has no `IMPLEMENTED` entry must not exist, so `ComingSoon` never renders for a cut screen.
- [ ] **Step 2: Verify there are no dangling references.** `cd client && npx tsc -b && npx eslint . && npx vitest run` passes. Then this returns nothing:
  `grep -rnE "/app/billing|verifier-api|/payments/mock|/demo/sha256|sha256-lab|features/(subscription|payment|verifier-key)|to=\"/demo\"|'/demo'" client/src | grep -v "routes.tsx.*path: '/demo'"`
- [ ] **Step 3: Verify direct URLs (Review Focus 3).** With the local stack running, use a scratch Playwright check (signed in as Alice) that `/app/billing`, `/app/verifier-api` and `/payments/mock` and `/demo/sha256` end on `/` (the catch-all `*` route) or the role home. If any renders "Coming soon" or a blank page, fix the routing.
- [ ] **Step 4: Commit** `feat(client): remove billing, checkout, verifier API and SHA-256 lab; hide demo guide`.

### Task 4: Reset cached API data on identity change (audit F04)

**Files:**
- Create: `client/src/apis/sessionCacheReset.ts`
- Modify: `client/src/store.ts` (export `createAppStore()`; `store = createAppStore()`; add the listener middleware)
- Create: `client/src/apis/sessionCacheReset.test.ts`

**Interfaces:**
- Produces: `sessionCacheReset: ListenerMiddlewareInstance` (from `createListenerMiddleware`) and `createAppStore(): EnhancedStore`.
- Behaviour: on `logout`, on `setActivePersona`, and on `setCredentials` whose `user.id` differs from the previous `auth.user?.id`, dispatch `APISlice.util.resetApiState()`.

- [ ] **Step 1: Write failing tests** in `sessionCacheReset.test.ts`, using `createAppStore()` and `APISlice.util.upsertQueryData` on any existing query endpoint to seed a cache entry for user A:
  - `it('drops cached queries on logout')`: after `logout()`, `Object.keys(store.getState().api.queries).length === 0`.
  - `it('drops cached queries when a different user signs in')`: `setCredentials(A)`, seed, `setCredentials(B)` → empty.
  - `it('keeps cached queries when the same user refreshes their token')`: `setCredentials(A)`, seed, `setCredentials(A with new token)` → the entry is still present.
- [ ] **Step 2: Run** `cd client && npx vitest run src/apis/sessionCacheReset.test.ts` and expect FAIL.
- [ ] **Step 3: Implement** the listener. Use `listenerApi.getOriginalState()` for the previous user id.
- [ ] **Step 4: Run** it again and expect PASS. Then run `npx tsc -b`.
- [ ] **Step 5: Commit** `fix(client): reset cached API data when the signed-in identity changes`.

### Task 5: On-camera polish

**Files:**
- Modify: `client/src/features/document/components/DocumentProgress.tsx:28-33` (drop the `On-chain` badge when `status === 'ANCHORED'`; keep "Awaiting anchor")
- Modify: `client/src/features/document/reference.ts` → `documentReference(doc): string | null` (the reference number when present, else `null`)
- Modify: callers `DocumentCard.tsx:21`, `CredentialRegister.tsx:74` (render nothing when `null`)
- Create: `client/src/features/document/reference.test.ts`
- Modify: `client/src/features/landing/content.ts` and `components/HeroVerificationSample.tsx`

- [ ] **Step 1: Write a failing test** in `reference.test.ts`: `documentReference({ contentJson: { referenceNumber: 'TECHCO/EXP/2026/K7M2P9' } })` returns that string, and a recommendation with no `referenceNumber` returns `null`.
- [ ] **Step 2: Run and see it fail, implement, run and see it pass.** Check whether `truncateHash` still has callers in `reference.ts`; if not, drop the import.
- [ ] **Step 3: Landing copy.**
  - Pillar 2 ("Anchored to a public ledger") gets a body about anchoring. Exact copy: `Every day's issued documents are hashed into one Merkle root and written to Polygon. Anyone can check the timestamp on a public block explorer, and the verdict never depends on it.`
  - Pillar 1's body gains the personal-key point. Exact copy: `The employee's manager signs, then HR co-signs, each with a personal key that only their own answers unlock. Neither can issue alone.`
  - `HeroVerificationSample` lists all five real checks in server order: `Issued by a verified organisation` (the exists check), `Content unchanged since signing`, `Manager signature`, `HR co-signature`, `Not revoked or expired` (status). This matches "Five checks" and the "5 of 5" in How it works. Use the real check labels from `server/src/modules/verification/verification-checks.ts` if they differ from these.
- [ ] **Step 4: Verify** with `npx tsc -b && npx vitest run && npx eslint src/features/document src/features/landing`.
- [ ] **Step 5: Commit** `fix(client): single anchor badge, no hash as reference, landing copy matches the product`.

### Task 6: Showcase seed and reset commands (server)

**Files:**
- Modify: `server/prisma/seed.ts`
- Create: `server/scripts/demo-showcase.ts`
- Create: `server/scripts/wipe-storage.ts`
- Modify: `server/package.json` scripts

**Interfaces:**
- Produces: npm scripts `demo:showcase` (`tsx scripts/demo-showcase.ts`), `demo:reset` (`prisma migrate reset --force --skip-seed && npm run db:seed && npm run demo:showcase`), and `demo:reset-prod` (runs `wipe-storage.ts`, then `demo:reset` with `dotenv -e .env.production.local`; use the repo's existing env-loading approach if `dotenv-cli` is absent).
- Produces: the stdout of `demo:showcase` prints the showcase document IDs and the batch root. Task 9's talk track uses them.

- [ ] **Step 1: Seed changes in `seed.ts`.**
  - Alice's email becomes `imperialsample+alice@gmail.com` and she stays discoverable.
  - Add `Riya Recruiter` (`recruiter@techcorp.example.com`) as a `RECRUITER` member of TechCorp.
  - Remove the fake audit rows that reference Bob's draft with `SIGNATURE_INVALID` (they read as an alarm on camera) and the seeded Bob notification.
  - Keep Bob's `REQUESTED` letter (inbox content) and drop the `DRAFT` one.
  - Update the header comment and the console summary.
- [ ] **Step 2: Write `demo-showcase.ts`.** Boot `NestFactory.createApplicationContext(AppModule)` with `WORKER=false`. Build an `AuthenticatedUser` for each actor from the DB (id, email, fullName, `hasPassword: true`, active memberships). Then drive the real services in order:
  1. Alice: `DocumentService.request` a `SALARY_PROOF` from TechCorp. Marcus `sign`s it with the step-up values and a valid salary subject. Hannah `approve`s it.
  2. Bob: `request` an `EXPERIENCE_LETTER`, then `sign` and `approve` it. The take revokes this one.
  3. Alice: `request` a `LETTER_OF_RECOMMENDATION` with `enableSkillExtraction: true`, then `sign` (an assessment mentioning Node.js, PostgreSQL and payments work) and `approve`. Then `await SkillService.extractForDocument(id)`, so Alice is matchable before the take even if the take's own extraction is slow. It has no reference number on purpose (Review Focus 4).
  4. `MerkleService.runBatch(techCorp.id)` once.
  5. Before this step, poll the AI service `/health` until `embedding_model` is not `loading` (up to 3 min). Riya: `RecruiterService.createJobOpening` with title `Backend Engineer — Payments`, `requiredSkills: ['Node.js', 'PostgreSQL', 'Payments', 'TypeScript']`, seniority `MID`, and a two-sentence description.

  Subjects must pass `content-validation.ts`; build them from the subject DTOs in `server/src/modules/document/dto/subjects/`. Exit non-zero on any failure. The script must refuse to run when `NODE_ENV=production` unless `--yes-reset-production` is passed.
- [ ] **Step 3: Write `wipe-storage.ts`.** It deletes every object in the configured Supabase Storage bucket through the existing storage adapter (`services/storage/`). If the adapter has no list/delete, use the Supabase Storage REST API with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from env. It must only run when `STORAGE_DRIVER=supabase`, and it prints the count only, never keys or contents.
- [ ] **Step 4: Verify locally.** Run `cd server && npm run demo:reset`. Expect it to exit 0, print three issued document IDs and a batch root, and `psql` to show 3 `ANCHORED` documents, 1 `REQUESTED` document and 1 job opening. Run `npm run lint && npx jest` and expect no new failures (the audit's 3 known failures are out of scope; note them if present).
- [ ] **Step 5: Commit** `feat(server): showcase seed and one-command demo reset`.

### Task 7: Scope fence for future audits

**Files:**
- Create: `SCOPE.md` (repo root)
- Modify: `CLAUDE.md` (root): add one line
- Modify: `documentation/IMPLEMENTATION_STATUS.md` (top note pointing to `SCOPE.md`)

- [ ] **Step 1: Write `SCOPE.md`.**
  - **In scope**, from spec §6.1: issuance with manager/HR step-up, public verification, free share links, Amoy anchoring, revocation, the admin console, and AI matching as a use case.
  - **Future scope (after the year-end evaluation), with where the dormant code lives:** billing and subscriptions (`server/src/modules/payment`, `subscription`), the Verifier API and API keys (`verifier-key`, `/verify/bulk`), bulk issuance (schema only), offline proofs, and the demo guide page (`/demo`, unlinked). Engineering-audit findings F01–F21 and additions A1–A10 are post-year-end hardening, with a link to `PROJECT_ENGINEERING_AUDIT.md`.
  - **Removed (not future):** the SHA-256 lab.
- [ ] **Step 2: Add to `CLAUDE.md`:** `- Scope: items under "Future scope" and "Removed" in SCOPE.md are out of scope for audits, reviews and suggestions unless the user explicitly asks about them.`
- [ ] **Step 3: Commit** `docs: SCOPE.md fences future-scope features out of audits`.

### Task 8: Recording package

**Files:**
- Create: `demo-recording/package.json` (`playwright` pinned to the version in `e2e/package.json`; scripts `record`, `rehearse`, `login`)
- Create: `demo-recording/config.ts` (base URLs per target, accounts, step-up values, hold timings, window geometry)
- Create: `demo-recording/preflight.ts`
- Create: `demo-recording/capture.ts` (ffmpeg start/stop)
- Create: `demo-recording/overlay.ts` (corner role label injected with `page.addInitScript`)
- Create: `demo-recording/take.ts` (the take, segments 1–9 of spec §6.5)
- Create: `demo-recording/preflight.test.ts` (run with `node --test` via `tsx`)
- Create: `demo-recording/README.md` (one-time setup, record command)
- Modify: `.gitignore` (`demo-recording/.profile/`, `demo-recording/out/`)

**Interfaces:**
- Consumes: Task 6's accounts and showcase data; `DEMO_PASSWORD`, `TARGET=local|prod`.
- Produces: `npm run login` opens the persistent profile headed so a team member can sign into Supabase and Gmail (and clear any PolygonScan challenge). `npm run rehearse` runs the take on `TARGET=local` without capture. `npm run record` runs preflight, starts ffmpeg, runs the take and stops ffmpeg, writing `out/careervault-demo-<timestamp>.mp4`.
- `preflight(target): Promise<{ ok: true } | { ok: false; reason: string }>` checks: API `/health` 200 (polled up to 6 min), `/health/status` reports `blockchain.driver === 'amoy'` for prod, the Supabase host resolves (prod), and the wallet balance is ≥ 0.01 POL (prod, via the `amoy_public_rpcs` publicnode RPC).

- [ ] **Step 1: Write failing tests** in `preflight.test.ts` with an injected `fetch` and resolver: an unhealthy API → `{ ok:false, reason:/API/ }`; driver `local` on prod → `reason:/simulator/`; a balance of 0.004 → `reason:/balance/`; all good → `{ ok:true }`.
- [ ] **Step 2: Run** `cd demo-recording && npm i && npx tsx --test preflight.test.ts`, see it fail, implement `preflight.ts`, run again and see it pass.
- [ ] **Step 3: Implement `capture.ts`.** Use `ffmpeg -f avfoundation -capture_cursor 1 -framerate 30 -i "<screenIndex>:none"`, crop to the browser window's screen rect (Retina ×2), and scale to `1920:1080`, encoding `libx264 -pix_fmt yuv420p -crf 18`. Find the screen index with `ffmpeg -f avfoundation -list_devices true -i ""`. Stop on SIGINT, waiting for the moov atom.
- [ ] **Step 4: Implement `take.ts`.** Use `chromium.launchPersistentContext('.profile', { headless:false, viewport:{ width:1440, height:810 } })` and a single window. Integration evidence opens with `context.newPage()` and is closed after showing. Type with `pressSequentially` at about 60 ms per key. Hold timings come from `config.ts`. PolygonScan's cookie banner is answered with its reject/essential-only option. Gmail is opened at `https://mail.google.com/mail/u/0/#search/from%3A(careervault)+OR+subject%3A(CareerVault)`; adjust the query to the real sender name after checking a received mail. The take fails loudly, without retrying silently, if an expected element is missing.
- [ ] **Step 5: Verify** with `TARGET=local npm run rehearse` against the local stack after `npm run demo:reset`. It must complete segments 1–9 with no thrown error. PolygonScan, Supabase and Gmail segments are skipped on `local` (logged as skipped).
- [ ] **Step 6: Commit** `feat(demo-recording): scripted continuous demo take with screen capture`.

### Task 9: Talk track

**Files:**
- Create: `demo-guide/talk-track.html` (standalone, full doctype, no external scripts; design tokens from the client: Plus Jakarta Sans fallback stack, trust navy)
- Modify: `demo-guide/index.html` (one link to the talk track at the top; the Nov 2 content is marked as superseded)

- [ ] **Step 1: Write the page.** For each take segment it gives the approximate start time (filled in from the final take), what's on screen, 2–3 points to say, and the evidence shown. It has a pre-show checklist: wake Render and Supabase 10 minutes before (with the curl commands), keep the video file local, and a fallback note. It lists the live document IDs printed by `demo:showcase` on prod.
- [ ] **Step 2: Verify** by opening it with `open demo-guide/talk-track.html` and checking it renders without network access.
- [ ] **Step 3: Commit** `docs(demo-guide): talk track for the recorded demo`.

### Task 10: Local rehearsal recording and review

- [ ] **Step 1:** Run `cd server && npm run demo:reset`, then with the client, API and AI service running locally, `cd demo-recording && TARGET=local npm run record`.
- [ ] **Step 2:** Extract one frame every 20 s (`ffmpeg -i out/<file>.mp4 -vf fps=1/20 out/frames/%03d.png`) and review every frame for:
  - previous-account data after a switch, "9+" bells, cut features, the double badge, a hash as a reference, spinners at hold points, the overlay label matching the actor;
  - checks going green, the Revoked verdict, and the recruiter seeing Alice with an explanation;
  - the downloaded PDF of the take's letter fits on one page (spec §6.3 item 6). If it is truncated, fix the PDF layout for that letter before going further.

  Fix and re-record until clean.
- [ ] **Step 3:** Run `cd e2e && npx playwright test` and expect it to pass (the lifecycle spec covers the changed share-link path).

### Task 11: Ship to production and hand over the take

- [ ] **Step 1:** Run `graphify update .`, then merge `security-review-refactor` into `main` and push (approved 2026-11-14). Watch Render until `/health` is 200 and Vercel serves the new build (no Billing in nav).
- [ ] **Step 2:** `cd server && npm run demo:reset-prod -- --yes-reset-production`. Record the printed IDs in the talk track.
- [ ] **Step 3:** Run `cd demo-recording && TARGET=prod npm run rehearse` up to segment 5 only (`--until=5`) to confirm production behaves, then `demo:reset-prod` again so the take starts clean.
- [ ] **Step 4:** Hand over to the team member with the exact commands: `npm run login` (sign into Supabase and `imperialsample@gmail.com`), then `DEMO_PASSWORD=… TARGET=prod npm run record`. Then review the produced video frames as in Task 10 Step 2.
- [ ] **Step 5:** Update the memory file `live_demo_state_oct2026.md` with the new prod state (doc IDs, wallet balance).
