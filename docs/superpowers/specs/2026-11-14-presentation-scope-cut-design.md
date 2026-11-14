# CareerVault — presentation scope cut, polish and demo recording

**Date:** 2026-11-14 · **Presentation:** week of 2026-11-16 · **Branch:** `security-review-refactor`

## 1. Intent

The final-year presentation is next week. The team will **not** run a live demo. They will play one
continuous screen recording (10+ minutes) and narrate over it, pausing and scrubbing as needed. The
recording must cover every flow worth talking about, and must show real evidence from the
integrations (PolygonScan, Supabase, Gmail) in the same take.

To get there the product is cut to its core story, the cut features are removed from the frontend
and recorded as future scope, the visible rough edges are fixed, production is reseeded with clean
showcase data, and the recording is produced by a script so it can be re-shot in minutes.

A mentor advised keeping the focus on verification and blockchain, not AI. AI matching stays, but only
as a short closing "what you can build on verified credentials" segment.

## 2. Goals

- One clear story, end to end: request → manager signs (step-up) → HR co-signs and issues → public
  verification (ID and share link) → anchoring on Polygon Amoy → PolygonScan evidence → revocation.
- Every screen in the take looks intentional: real-looking data, no leftover test noise, no
  references to cut features.
- A re-runnable recording pipeline that produces one uncut video on the **production** URL.
- A talk track the presenter can glance at while the video plays.
- Cut features are documented so future audits (human or AI) treat them as out of scope unless explicitly asked.

## 3. Non-goals

- The engineering audit's hardening findings (F01–F21, A1–A10) other than the two listed in §6.3.
  They move to future scope.
- Removing backend modules for cut features. They stay dormant.
- Voiceover or heavy captions. The presenters narrate live.
- A separate edited-chapter video. One continuous take is the deliverable.

## 4. Anti-goals (a failure even if it works)

- AI matching taking more than about 1 minute of the video, or being framed as the main contribution.
- Any fake integration shown on camera (mock checkout, simulated chain).
- The take showing data from the previous account after a sign-out, a "9+" notification badge, or a
  half-finished screen.
- Typing production passwords into the site on Claude's behalf. The final production take is
  launched by a team member (see §6.5).

## 5. Constraints

- **Production:** Vercel frontend `career-vault-steel.vercel.app`, Render API (free tier, 1–5 minute
  cold start), Render AI service, Supabase Postgres and Storage (free tier, **pauses after about 7 days idle**;
  it paused once already and blocked the Render boot at `prisma migrate deploy`).
- **Anchor wallet:** 0.085 POL on 2026-11-14, about 0.0046 POL per anchor, so about 18 anchors. Enough for rehearsals.
- **Production is used only by the team.** Wiping and reseeding it is approved (2026-11-14).
- **Coding discipline and design tokens:** project memories (file size caps, feature-first layout,
  Lucide icons, trust-navy and status semantics).
- No claude.ai Artifacts; guides are local HTML in the repo. No Claude co-author lines in commits.

## 6. What gets built

### 6.1 Scope: keep, keep-brief, cut

| Area | Decision | Frontend action |
|---|---|---|
| Holder: wallet, documents, request, document detail | **Keep** | polish only |
| Manager: inbox, sign with step-up, signed | **Keep** | — |
| HR: approvals, issued, revoke | **Keep** | — |
| Public verify (ID and share token) | **Keep** | — |
| Share links | **Keep, now free** | remove the payment path from the create dialog ("$1.99 per link" copy, checkout redirect, return-from-checkout handling) |
| Admin: organisation, members, analytics with anchoring, audit log | **Keep** | drop the billing and API-key bits if any |
| Profile: signing security enrolment | **Keep** | — |
| AI: holder Talent Profile, consent checkbox, recruiter Talent Search and Matches | **Keep, brief** | no change beyond polish; it gets a short closing chapter |
| SHA-256 lab (`/demo/sha256`) | **Cut completely** (team decision 2026-11-14) | delete page, route, `features/sha256-lab`, the lab card and the demo step that links to it |
| Billing and plans (`/app/billing`) | **Cut** | delete page, nav entry, `features/subscription` |
| Mock checkout (`/payments/mock`) | **Cut** | delete page, route, `features/payment` |
| Verifier API keys (`/app/verifier-api`) | **Cut** | delete page, nav entry, `features/verifier-key` |
| Demo guide page (`/demo`) | **Hidden, route stays alive** | keep the page and route reachable by direct URL only; remove every link to it (header link in `PublicLayout`, menu item in `PortalLayout`, anywhere else); strip its SHA-256 lab references |

Shared modules that cut pages use but kept pages also use (for example `features/system-status`) stay.

### 6.2 Server change: free share links

`ShareLinkService.create` no longer opens a payment session. Every link is created active
immediately, as the premium path does today. The payment and subscription modules, the
share-link payment cron and the `Payment` table stay in place, dormant. Unit tests are updated to the
new behaviour.

### 6.3 Fixes the camera would catch

1. **F04: data from the previous account survives a sign-out.** Reset all RTK Query state on sign-out
   and on any identity change. The take signs in as four accounts in a row, so this is mandatory.
2. **Document detail shows "ANCHORED" and "ON-CHAIN" badges side by side.** Show one.
3. **Wallet lists a Letter of Recommendation by a hash** (`ec13b47a…fdd7`) instead of a reference
   number. Show a human reference, or the type plus issuer, consistently.
4. **Landing page copy.** The "Anchored to a public ledger" pillar's text describes personal keys. The
   "Five checks" claim doesn't match the three-row sample. Make pillar, sample and how-it-works agree.
5. **Notification noise.** The reseed clears it. Check that the bell shows only the events the take creates.
6. **F16 PDF truncation:** only if the take's letter overflows one page. Otherwise it goes to future scope.
7. **Leftover links to cut features:** search the whole client for links to the cut routes and remove them.
8. Anything else found during implementation that a viewer would see as broken gets fixed or reported.
   Nothing beyond that.

### 6.4 Seed and production reseed

Extend `server/prisma/seed.ts` so a fresh database is presentation-ready:

- **Organisations:** TechCorp (verified), GlobalSolutions (second org, kept).
- **People:** Alice (holder, discoverable), Bob (holder), Marcus (manager), Hannah (HR), Olivia
  (org admin), Gabriel (GlobalSolutions manager), and **new: a recruiter at TechCorp** with one open
  role whose text overlaps Alice's experience, for example "Backend engineer: payments, Node.js, PostgreSQL".
- **Signers enrolled** (Marcus, Hannah) with step-up details recorded where the team can find them (git-ignored).
- **Background documents:** two or three issued documents per holder across the three types, so the
  wallet, the Issued list and Analytics look lived-in. These get one real Amoy anchor batch after the reseed.
- No stray drafts or noisy notifications.
- **Alice's email:** `imperialsample+alice@gmail.com` (a real inbox, so Gmail evidence can be shown).

Then: wipe production, reseed, enroll signers, run one background anchor, refresh the demo-guide
document IDs, and record the new IDs in the run sheet. Prod env lives in the git-ignored
`server/.env.production.local`.

### 6.5 Recording pipeline

- **Location:** `demo-recording/` at the repo root, with its own `package.json` (Playwright).
- **Mechanism:** a Playwright script drives a **headed** Chromium window at a fixed size (1920×1080
  content). The Mac records that region with ffmpeg (`avfoundation`), so the real URL bar and tabs are
  visible. One continuous output file (`.mp4`), no cuts.
- **Integration evidence opens as new tabs inside the same take:**
  - PolygonScan: the anchor transaction, the contract's `verifyRoot` read with the batch root, and
    the `DocumentRevoked` event after the revocation.
  - Supabase: the Storage bucket with encrypted PDF blobs, and the `documents` table showing ciphertext columns.
  - Gmail (`imperialsample@gmail.com`): the issuance and anchoring emails, shown through a search URL that lists only CareerVault mail.
- **Logins for Supabase and Gmail:** a team member signs in once inside the script's own persistent
  browser profile (`demo-recording/.profile`, git-ignored). Claude never handles those passwords.
- **Production passwords:** the script reads `DEMO_PASSWORD` from the environment. A team member
  launches the production take (`DEMO_PASSWORD=… npm run record`). Claude develops and rehearses the
  script against the local stack, where it may use the seed default.
- **Pacing:** human-speed typing. Holds of 3–4 s on key screens (step-up prompt, wrong-answer refusal,
  verification checks, PolygonScan transaction, Revoked verdict). A small fixed corner label naming
  the current role and account, injected by the script, not part of the product.
- **Preflight inside the script:** wake Render (poll `/health` until 200), confirm Supabase resolves,
  confirm the wallet balance is above the cost of one anchor, then start recording.
- **macOS:** the terminal needs Screen Recording permission (one-time, granted by the team member).

**Take order (one continuous take):**

1. Landing page: the problem, the three pillars, how it works.
2. Alice requests an Experience Letter from TechCorp and ticks AI skill extraction.
3. Marcus opens the inbox, fills in the record, enters one wrong step-up answer (refused), then the
   right ones, and signs.
4. Hannah reviews, does the HR step-up, and clicks Approve & issue. Cut-in: Supabase Storage shows the encrypted PDF.
5. Alice opens the document, downloads the PDF, creates a free share link, and opens public
   verification by share link and then by document ID. Checks go green; the on-chain badge reads pending.
6. Olivia, Analytics: Anchor now. Cut-in: the PolygonScan transaction, then `verifyRoot` returns
   true. Back: re-verify shows "Timestamped on-chain".
7. Hannah revokes a background document. Verification shows Revoked. Cut-in: the `DocumentRevoked` event.
8. Olivia: members and audit log (brief).
9. Built on top: the recruiter searches, sees Alice ranked with the "why" explanation; Alice's
    Talent Profile shows her extracted skills and her consent control. About 1 minute.

### 6.6 Future scope and the audit fence

- **New `SCOPE.md` at the repo root:** the in-scope feature list (§6.1), the future-scope list (billing
  and payments, Verifier API, demo guide page, bulk issuance, offline proofs, audit findings F01–F21
  as post-year-end hardening), and where the dormant code lives.
- **`CLAUDE.md` gets one line:** treat `SCOPE.md` future-scope items as out of scope in any audit or
  review unless the user explicitly asks.
- `documentation/IMPLEMENTATION_STATUS.md` points to `SCOPE.md` instead of duplicating it.

### 6.7 Talk track

A local HTML page in `demo-guide/` (replacing the Nov 2 run sheet's role). For each take segment: the
approximate timestamp, what's on screen, 2–3 points to say, and the evidence being shown. It also
carries the pre-show checklist: wake Render and Supabase 10 minutes before, and have the video file
and a local copy ready.

### 6.8 Take lifecycle and production operations (Claude's calls, from the builder check)

- **Every production take starts from a fresh reseed.** One command (`npm run demo:reset-prod` in
  `server/`, reading `server/.env.production.local`) wipes the database and the Supabase Storage bucket,
  reseeds, enrols the signers and runs the background anchor batch. The take itself never has to be
  safe to re-run. Rehearsals run against the local stack (simulated chain, free).
- **Gas budget:** about 3 transactions per production take (background anchor, take anchor,
  revocation flag), so about 5 production takes on 0.085 POL. Top up from the Amoy faucet if more are needed.
- **Claude runs the production reseed** with the git-ignored prod env file (approved: production is
  team-only). Claude does not type production passwords into the site; the take is launched by a team member.
- **Step-up details** stay the public demo values (DOB 1990-01-15, DEMO-0001, …) and are typed on camera.
  Production is team-only, and showing the step-up is part of the story. The script reads them from
  the environment with these values as defaults.
- **Display:** this Mac is a 2560×1664 Retina built-in display. The browser window is sized to a
  16:9 content area that fits on screen (about 1440×810 points plus browser chrome). The capture is at
  Retina scale and the output is encoded at 1920×1080. Exact numbers are left to the builder.
- **PolygonScan:** the registry contract is verified (Read Contract was used on Nov 2), so the
  `verifyRoot` cut-in works. Its cookie banner is dismissed with the most privacy-preserving option.
  If PolygonScan shows a bot challenge, the team member clears it by hand in the script's profile
  before the take. The script never attempts to solve it.
- **Deploy:** the code changes reach production by merging this branch to `main` (Render and Vercel
  deploy from `main`), after the local rehearsal passes (approved 2026-11-14).

## 7. Approaches considered

- **Feature cut.** Chosen: delete the frontend code and keep the backend dormant. Rejected: a feature flag
  (leaves dead UI for the next audit; the user asked for full removal), and deleting backend modules
  (migration and test churn for no demo benefit).
- **Recording.** Chosen: a scripted headed browser plus ffmpeg screen capture (smooth, re-runnable, real
  URL bar, new tabs in the same take). Rejected: Claude driving the user's own Chrome (dead air between
  actions, personal browser chrome visible, slow retakes), and Playwright's built-in page video (no URL
  bar; every new tab is a separate file, which breaks the uncut take).
- **Where to record.** Chosen: production, with the local stack as rehearsal and fallback. Rejected:
  local only, because `localhost` on screen undercuts "this is deployed".
- **Share links.** Chosen: free for everyone. Rejected: a one-click mock payment (a fake integration on camera).

## 8. Decisions

- **Decided 2026-11-14:** SHA-256 lab removed completely. `/demo` stays reachable only by direct URL.
  Claude may merge to `main` and push once the local rehearsal passes.
- **Decided 2026-11-14: Gmail inbox** is `imperialsample@gmail.com`. Alice is seeded as
  `imperialsample+alice@gmail.com`. The script's own browser profile is signed into that one account
  (once, by a team member), and the take opens a Gmail search URL that shows only CareerVault mail,
  so no other inbox content appears on camera.

## 9. Left to the builder

Exact component edits, the reference-number display rule, the corner-label styling, the recruiter's
name and opening text, the background documents' contents, ffmpeg device and crop parameters, and
the hold timings, all within the constraints above.
