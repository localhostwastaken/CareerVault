# Final presentation deck — implementation plan

> Executed natively in the session that wrote it (the user said "go ahead").

**Goal:** Build `CareerVault - Final Presentation.pptx` (16 presented slides plus 1 backup) from `KJSSE  PPT Template.pptx`, as specified.
**Architecture:** A python-pptx generator (session scratchpad) opens the template, reuses its master (logos, maroon band) and
the TITLE_ONLY layout, and draws every diagram as native, editable shapes. Speaker notes go in the notes pane.
**Tech stack:** python-pptx in a Python 3.12 venv; LibreOffice and pdftoppm for rendering; the pptx skill's `validate.py`.
**Spec:** `docs/superpowers/specs/2026-11-17-final-presentation-deck-design.md`

## Global constraints

- Slide 16:9, 13.33" × 7.5". Content stays between y 1.85" and y 6.3" (the master band starts at y 6.65"), x 0.6" to 12.75".
- Titles use the template's title placeholder (Arial, 30 pt, bold, as in the earlier decks). Body text ≥ 14 pt, captions ≥ 10 pt.
- Colours: maroon `A42530` (template) dominant, red `D9222A` sparingly, charcoal `1F2937` text, grey `6B7280` captions;
  verified `15803D`, pending `A84D07`, revoked `B4231F` only where they mean that status.
- People tokens, the same colour everywhere: Alice, Marcus, Hannah, Olivia, Riya, Bob.
- Facts as verified on 2026-11-17: 399 server unit and 18 contract tests pass (claim "400+"); five checks with the exact
  labels from `verification-checks.ts`; SHA-256("Experience: 3 years") = a3b4e6b2…, ("Experience: 8 years") = ec0a4d88…;
  Merkle proof 544 B / 0.045 ms at 100,000 documents (`research-paper/build/bench_results.txt`); about 0.0035 POL per anchor.
- Presenters: TM1 slides 1–5 · TM2 slide 6 + video 00:00–05:42 · TM3 video 05:42–end + slides 7–9 · TM4 slides 10–16.
- No feature from SCOPE.md "Future scope" or "Removed" appears, except as next steps on slide 15. No "demo guide" or
  "local-simulator" visible in screenshots.

## Review focus

1. Text overflow inside cards at 14 pt, which is the most likely defect.
2. A screenshot showing a cut feature or a local URL.
3. Presenter labels or handover lines that don't match the split above.
4. Leftover template text ("Title", "Name of Presenter") or a missing slide number.
5. Claims that contradict the current product (JCS library, offline proof file, six checks).

---

### Task 1: Generator, helpers, title and Part 1 (slides 1–5)
- [ ] Build helpers: new slide on TITLE_ONLY with a slide-number placeholder; card; token; arrow; notes.
- [ ] Slides 1–5 per the spec table, with notes.
- [ ] Render; check visually.

### Task 2: Demo map and Part 2 (slides 6–10)
- [ ] Slide 6 timeline (two shades for TM2 and TM3); notes carry the talk-track points per segment.
- [ ] Slides 7–10 diagrams per the spec.

### Task 3: Part 3 and references (slides 11–17)
- [ ] Crop screenshots (verify panel without its banner; PolygonScan without the cookie bar; Supabase as is).
- [ ] Slides 11–17.

### Task 4: QA
- [ ] `slide_text.py` content check and placeholder grep.
- [ ] `validate.py --original "KJSSE  PPT Template.pptx"` passes.
- [ ] Render all slides to images and inspect every one fresh; fix and re-render.
