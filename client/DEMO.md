# CareerVault — Investor Demo Script

A 5–7 minute walkthrough hitting every major SRS module via the **role switcher** in the top bar (visible by default; pass `?demo=0` to hide).

> **Setup:** `cd client && npm run dev` → open http://localhost:5173 and start at `/`.

---

## 0. The opener (30s)

Land on **`/`** — Landing page.
- Show the hero, the live counter ("184 documents anchored today"), the on-the-right "Verified" preview card.
- Scroll past the **"I am a..." role selector** (5 personas) and **"How it works"** (the 6-step flow).
- Click the **trust strip** to show partner logos (Google, TCS).
- Click **"See a verified document"**.

## 1. Public Verifier — the marquee (60s)

Now on **`/verify/abc-123-def-456`** (no login required).
- Six-step verification animates: Hash → Manager sig → HR sig → Merkle proof → On-chain → Revocation/expiry.
- Show the document preview (Sarah Chen's experience letter from Google).
- **Cryptographic proof card** on the right: full Merkle tree visualization with the leaf, sibling hashes, and root.
- Click **"View on Polygon"** → opens Polygonscan (mock URL).
- "This is what a recruiter sees, in 800ms, with zero phone calls."

## 2. Sign in & switch into the demo (15s)

Click **Sign in** in the top right → land on `/auth/login`.
- Type any email + password (e.g. `holder@demo.com` / `demo`). The login form auto-routes to the holder dashboard.
- Point out the **role switcher** in the top bar — "this is the demo control; in production each user has one role."

## 3. Holder workflow — Sarah Chen (90s)

Already on **`/holder`** (Holder Dashboard).
- Stat cards: 4 anchored documents, 2 awaiting HR, 4 active share links, trust score 96/100 ("top 6% globally").
- Click into a document card → **Document Detail** (`/holder/documents/doc_001`).
- Show the full PDF preview, the inline Six-step verification report, the blockchain anchor card with block #, tx hash, IPFS CID.
- Back to **My Documents** (`/holder/documents`) — show filters: type, status tabs (All / Verified / In progress / Inactive). Show a *revoked* and an *expired* card to demonstrate status semantics.
- **Request Document** (`/holder/request`): pick org Google → manager email `mark.johnson@google.com` → type Experience → period → review → "Send magic link" → success screen.
- **Share Links** (`/holder/links`): show the existing list, click **"Generate verified link"** → paywall modal opens with **Premium $5/mo vs One-time $2** options → pay → instant link generated.

## 4. Manager workflow — Mark Johnson (60s)

Top bar → **Demo as → Manager**.
- Land on **`/manager`** (Manager Inbox). Show the "Requests waiting on you" with Sarah's draft request.
- Click into it → **Drafting Wizard** (`/manager/draft/doc_006`).
- **Critical:** type freely in the letter body — show the **AI Skill Extraction** panel on the right updating live as you type. Mention "React", "TypeScript", "AWS" appearing.
- Click **"Sign & Submit to HR"** → returns to inbox; status flow card explains the two-step model.

## 5. HR workflow — Linda Rao (45s)

Top bar → **Demo as → HR Approver**.
- **`/hr`** Approval queue: show pending docs from managers.
- Click into one → **HR Review** (`/hr/review/doc_005`).
- Side-by-side: document preview + **cross-check panel** (holder identity, employment record, role match, allowlist). All checks ✓.
- Click **"Approve & finalise issuance"** OR show the **reject dialog** with structured reason codes ("Wrong dates", "Not eligible") + free-form note.
- Briefly show **`/hr/bulk`**: drop CSV → preview with valid/invalid rows → issue 6 documents at once with a progress bar.

## 6. Org Admin workflow — James Walsh (45s)

Top bar → **Demo as → Org Admin**.
- **`/admin`** Organisation: show DNS verification card with the TXT token. Click **"Run DNS check"** → animated lookup → verified state.
- **`/admin/members`**: list of admins/HR/managers, wildcard `*@google.com` toggle (with warning). Show the **"Invite member"** dialog with role picker + magic-link explanation.
- **`/admin/audit`**: full timeline. Filter to **7-year compliance** tier — show DOC_ANCHOR, DOC_HR_APPROVE, DOC_REVOKE, DNS_VERIFIED. "Every action — actor, IP, before/after, retention tier."

## 7. Recruiter / Verifier workflow — Priya Shah (75s)

Top bar → **Demo as → Recruiter**.
- **`/recruit`** Talent search.
- Skill chips already populated: **React, TypeScript, AWS, System Design**. Add another or remove one — list re-ranks live.
- Highlight Sarah Chen at the top with a 92/100 score, all four required skills as green badges ("verified" tone).
- Click into Sarah → **XAI breakdown** card on the right shows a SHAP-style waterfall:
  - +25 for verified React skill
  - +25 for verified TypeScript skill
  - +25 for verified AWS skill
  - +25 for verified System Design skill
  - +X for document recency
  - +X for issuer trust score
- "Mathematically auditable. EU AI Act compliant. No black boxes."
- **`/recruit/anchor`** Anchor Engine: show the live Merkle tree viz, today's pending batch, the countdown to midnight UTC, and the last 7 anchored roots with Polygonscan links.

## 8. Close (30s)

Switch back to **Demo as → Holder**. Land back on the Holder Dashboard.
- "One platform. Five roles. Every document cryptographically verifiable in seconds. $0.01 per blockchain anchor regardless of volume. $5/mo per holder for unlimited share links."
- "First version of this prototype is live. Backend, smart contract, KMS — all spec'd in the SRS, ready to wire up."

---

## Demo controls

- **Role switcher** is always in the top bar — flip identity instantly.
- **`?demo=0`** in the URL hides the role switcher (for "production" investor screenshots).
- **localStorage** persists the active role across reloads.
- All async actions (sign, approve, generate link, DNS check) include realistic 200–1100ms delays so the UI feels real.
- Every status badge, signature chip, hash, and Polygonscan link is hardcoded but consistent — Sarah's `doc_001` always points to the same Merkle root, the same tx hash, and the same on-chain block number.

## Known prototype scope

- Backend (NestJS) is unwired — every action is in-memory mock.
- PDF preview shows a static `/sample.pdf` stub. Real Puppeteer rendering is in the SRS.
- Magic-link sending is mocked; real implementation is via AWS SES with 15-min Redis TTL.
- AI skill extraction uses a curated keyword → ontology map. Production will use SpaCy NER with a global skill ontology.
- SHAP weights are computed from a deterministic scoring function. Production will use a trained interpretable model.
