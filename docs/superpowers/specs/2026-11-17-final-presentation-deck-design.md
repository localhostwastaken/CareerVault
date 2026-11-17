# CareerVault — final external presentation deck

**Date:** 2026-11-17 · **Output:** `CareerVault - Final Presentation.pptx` (repo root, next to the earlier decks)
**Template:** `KJSSE  PPT Template.pptx` (16:9, 13.33" × 7.5": title layout with campus photos, content layout with the maroon footer band)

## 1. Intent

The final-year external presentation: 20 minutes, then 10 minutes of questions. About 10 minutes is the recorded
production demo (`demo-recording/out/careervault-demo-prod-2026-11-16-06-19.mp4`, 9:49, narrated live using
`demo-guide/talk-track.html`). The other 10 minutes are slides.

The deck tells one story, about **Alice's experience letter from TechCorp**, using the same people as the video (Alice,
Marcus, Hannah, Olivia, Riya, Bob). It has three parts: why it matters and who the people are (before the video), the
video, then "behind the screen" (after the video). Each technical slide is named after a moment in the video, so the
presenter can explain the technical side by pointing back at something the evaluators just watched.

The team does not know the cryptography in depth. The slides must stay simple enough to explain confidently, while
still showing that the team understands the technical side.

## 2. Goals

- One continuous story. Each slide builds on the one before it; no slide feels like a separate piece.
- Real technical terms (SHA-256, HMAC, PBKDF2, RSA-2048, AES-256-GCM, Merkle tree, Polygon), each with a plain one-line meaning.
- Speaker notes on every presented slide, in plain words, about 40 seconds of speech each, with an "If asked…" answer on the technical slides.
- Four presenters in continuous blocks. Labelled Team Member 1–4; no names in the split.

## 3. Non-goals and anti-goals

- No methodology or Gantt chart, and no publication slide (no paper has been submitted).
- Nothing about features in SCOPE.md "Future scope" or "Removed" (billing, verifier API, SHA-256 lab, demo guide page),
  except as next steps on the limitations slide.
- **Anti-goals:** full slides; jargon with no plain meaning; claims the product no longer makes (the research paper's
  JCS library, offline proof file, single organisation key, six checks). The deck follows the product as it is now
  (SCOPE.md, talk track): its own byte format, personal signer keys, server-side verification, five checks.
- AI matching presented as the main contribution. It gets one slide, framed as "built on top".

## 4. Approaches considered

- **Chosen: set up → video → behind the screen.** People and problem first, the video plays uninterrupted, then the
  technical slides walk back through the video's moments. This shows the concrete before the abstract and is easiest to narrate.
- Rejected: video in pieces between slides. Switching between PowerPoint and the player about 9 times live is fragile.
- Rejected: full story on slides, video at the end. The video then repeats what was already said.

## 5. Slides

Time budget: about 10 minutes of slides around the video. P = presenter.

| # | P | Title | Content | Visual |
|---|---|---|---|---|
| 1 | TM1 | CareerVault | "Career documents anyone can verify in seconds"; team names and "LY Project · K J Somaiya School of Engineering", as in the earlier decks | Template title layout |
| 2 | TM1 | Alice's letter: real or fake? | Alice changes jobs; her new employer gets a PDF letter and cannot tell whether it is real. 6% white-collar and 9.46% IT/ITES discrepancy rate (AuthBridge 2025); 23% in India (HireRight). Today: call HR, emails, agencies, days to weeks | Three big stat callouts, small source line |
| 3 | TM1 | What already exists | Table from the paper's Table I (Marella & Vijayan, Blockcerts/MIT, EduCTX, Gräther et al., Herbke et al.): ledger, what goes on-chain, focus. A highlighted CareerVault row. The gap: who approved it, private data, a working deployment | Simple table, CareerVault row tinted |
| 4 | TM1 | What we set out to do | Four objectives, each tied to a person: trusted at the source (Marcus and Hannah both sign); private (Alice's data locked, nothing personal on-chain); instant (any recruiter, no account, seconds); public receipt (Polygon) | 2×2 icon cards |
| 5 | TM1 | Meet TechCorp | Alice (employee), Marcus (manager), Hannah (HR), Olivia (org admin), Riya (recruiter), Bob (a second employee). Document lifecycle: Request → Sign → Co-sign & issue → Share & verify → Anchor → Revoke, each with its real status (REQUESTED, PENDING_HR, ISSUED, ISSUED, ANCHORED, REVOKED); DRAFT and EXPIRED are in the notes. "Watch for these people in the demo" | Six person tokens plus one flow arrow |
| 6 | TM2 → TM3 | Demo: one letter, start to finish | The nine video chapters with timestamps (00:00 landing · 00:40 Alice requests · 01:24 Marcus signs · 02:36 Hannah issues · 04:00 share & verify · 05:42 anchoring · 07:12 revocation · 08:12 oversight · 08:36 matching). TM2 narrates 00:00–05:42, TM3 takes over at 05:42 | Timeline, two shades for the two narrators; notes carry the talk-track points |
| 7 | TM3 | Architecture diagram | Component-level view of production, built from the code and render.yaml: Web app (React, Vite, Vercel) with one portal per person plus the public verify page → REST → API server (NestJS, Docker on Render) with eight modules over a security layer (AES-256-GCM field encryption, RSA-2048 org keys under a master key) → Supabase (Postgres + pgvector via Prisma; Storage for encrypted PDFs and keys), AI service (FastAPI; Groq, MiniLM, LightGBM + SHAP), Polygon Amoy (AnchorRegistry via ethers.js), Gmail SMTP. Nothing from the old Canva diagrams (no Redis, AWS, IPFS or Stripe) | Excalidraw diagram, clean style (source in `demo-guide/diagrams/`) |
| 8 | TM3 | When Marcus signed | His DOB, ID and three answers → PBKDF2, 600,000 rounds → his personal key → HMAC-SHA256 seal on the letter's exact bytes → TechCorp's RSA-2048 signature. Wrong answer refused; 5 wrong in 15 minutes locks signing | Left-to-right flow, small "refused" callout |
| 9 | TM3 | When Hannah co-signed | Ends with the handover to TM4. Two-person rule: a different person must approve (the server enforces it). SHA-256 as a fingerprint: "Experience: 3 years" → a3b4e6b2…, "Experience: 8 years" → ec0a4d88… (real values). Hannah first checks the letter still matches the fingerprint Marcus signed, then adds her own seal and signature | Two people plus a fingerprint comparison |
| 10 | TM4 | Where Alice's letter is stored | AES-256-GCM: master key (server secret, never in the database) → fresh key per row → only ciphertext stored; the PDFs too. Before: readable JSON. After: `cvenc:v1:…` (seen in the video at about 03:36) | Before/after panels plus a three-step key chain |
| 11 | TM4 | When the recruiter verified | The recruiter sends only the document ID or share link, with no account. The server runs five checks: issued document on record; content unchanged since signing; Marcus's signature; Hannah's signature; not revoked or expired. Returns a verdict and nothing secret | Five green ticks leading to VERIFIED |
| 12 | TM4 | When Olivia anchored, and Hannah revoked | Merkle tree: fingerprints paired up to one 32-byte root, sent to our contract on Polygon Amoy; one transaction per batch whatever its size; `verifyRoot` → exists: true. Revocation: the database says Revoked at once, and a DocumentRevoked event follows on-chain. "The chain is a receipt, not the judge" | Excalidraw Merkle tree, clean style (source in `demo-guide/diagrams/`); revoke panel |
| 13 | TM4 | Built on top: Riya finds Alice | Alice consents (off by default) → skills extracted (LLM via Groq) → turned into vectors (MiniLM) → nearest matches (pgvector) → ranked with a reason (LightGBM + SHAP). Alice stays in control (she can switch discovery off and sees the extracted skills). The ranker baseline is only an "If asked" note | Five-step pipeline |
| 14 | TM4 | Results: what each person gained | Outcomes earned, not metrics. Alice: her letter can't be faked, and her data is encrypted and shared on her terms. Her new employer: seconds, not weeks. TechCorp: no one issues alone, every action is logged, revoking works at once. Riya: hires on verified skills, with a reason for every match. Each card shows Before and Now | 2×2 cards with people tokens |
| 15 | TM4 | Future scope | Visionary, tied to people: zero-knowledge proofs (Alice proves "salary above ₹10 lakh" without the letter), passkey signing on Marcus's and Hannah's phones, one lifelong career wallet (DigiLocker, W3C Verifiable Credentials), and hiring that learns from verified outcomes (Riya). No limitations slide | 2×2 numbered cards |
| 16 | TM4 | Alice's letter, in one line | Signed by two people, stored locked, checked in seconds, timestamped in public. Thank you · Questions | Four ticks, closing slide |
| 17 | — | References (backup, skipped) | IEEE-style, from the paper's reference list (AuthBridge, HireRight, Haber & Stornetta, Merkle, Blockcerts, EduCTX, Gräther, Herbke, W3C VC, SHAP/TreeSHAP, LightGBM, pgvector) | Plain list |

Approximate timing: TM1 about 3 min · TM2 about 6 min (slide 6 + video to 05:42) · TM3 about 6 min (video to the end + slides 7–9) · TM4 about 5 min (slides 10–16).
Each block's last note ends with a handover line ("Over to Team Member N").

## 6. Design (Claude's calls)

- Built from the template: unpack, duplicate the content-layout slide, edit the XML. The Somaiya logos and maroon
  footer band stay as they are.
- Palette: template maroon as the dominant accent, dark charcoal text, white background. Status colours only where
  they mean something: verified green, pending amber, revoked red (the product's semantics).
- One repeated visual element: people shown as small round initial tokens (A, M, H, O, R, B), each person always the same colour.
- Slides 7 and 12 are Excalidraw diagrams in a clean style (no hand-drawn roughness, Helvetica, deck colours, right-angled connectors), rendered with the Excalidraw library (the Excalidraw MCP only previews in chat); their `.excalidraw` sources live in `demo-guide/diagrams/`. All other visuals are native, editable PowerPoint shapes.
- No limitations slide. Weak spots appear only as "If asked" lines in the speaker notes.
- One grid: content x 0.6–12.75, y 1.95–6.25; 0.25" gutters and padding; titles aligned to the content's left edge; a single bottom-strip style.
- Fonts: the template's own; body text never below 14 pt.
- Screenshots only on slide 14, reused from `demo-guide/img/`.

## 7. Left to the builder

Exact positions, icon choices, token colours, wording of the speaker notes within the content above, and which three
screenshots best show the evidence.
