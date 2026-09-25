# CareerVault — Product UI/UX Direction

## Purpose

This document defines the visual and interaction direction for the CareerVault client. It complements `Claude.md` and is intentionally product-specific.

The objective is **not** to make CareerVault look fashionable. The objective is to make it feel like a credible instrument for recording, issuing, and verifying professional credentials.

CareerVault should feel:

- **trustworthy** rather than futuristic
- **editorial** rather than template-driven
- **precise** rather than decorative
- **institutional** rather than corporate-marketing-heavy
- **quietly premium** rather than flashy
- **information-rich** without feeling dense or bureaucratic

The interface should communicate that CareerVault handles records that people may use for hiring, employment, compensation, and professional reputation.

The core visual metaphor is:

> **A modern professional registry: part credential archive, part verification instrument, part editorial document system.**

---

# 1. Non-Negotiable Design Principle

The interface must never look like it came from a generic AI SaaS template.

Do not substitute visual novelty for product substance.

A strong CareerVault screen should have a reason for every major element:

- Why is this information shown here?
- Why is it shown at this visual priority?
- What action is the user expected to take?
- What evidence supports the result?
- What happens if the user does nothing?

When in doubt, prefer **hierarchy, typography, spacing, rules, data structure, and meaningful content** over decoration.

---

# 2. Design Character: "The Credential Registry"

The existing `Ledger` system in `Claude.md` remains the source of truth for tokens, typography, spacing, status semantics, accessibility, component primitives, and state handling.

This document defines how those primitives should be composed into a distinctive product language.

## Visual references

Use these references as conceptual direction, not as direct copying:

- Swiss editorial systems
- premium financial statements
- archival registries
- legal certificates and records
- modern research publications
- well-designed enterprise security products
- high-end editorial websites with restrained typography

Avoid visually imitating:

- crypto dashboards
- AI startups
- generic HR SaaS
- developer tooling landing pages
- fintech trading terminals
- design-system demo pages

---

# 3. What Makes CareerVault Visually Distinct

## 3.1 Treat information as the decoration

The product should look interesting because the **information itself is well presented**.

Examples:

- a document ID rendered beautifully in mono
- a precise issuance timestamp
- a signing chain
- an anchor block reference
- a verification sequence
- an audit trail
- an issuer identity record
- a candidate's verified skills

Do not add decorative circles, blobs, grids, glows, or abstract backgrounds to make an empty page feel designed.

## 3.2 Use editorial rhythm instead of card repetition

Do not turn every section into a rounded card.

Use a mixture of:

- open sections
- ruled rows
- bordered panels
- dense tables
- split layouts
- inset wells
- timelines
- document previews
- numbered sequences
- side annotations
- large typographic statements

Cards should represent an actual bounded object, not simply provide a background behind text.

## 3.3 Use asymmetry intentionally

Not every page should be a centered dashboard.

Prefer compositions such as:

```text
PAGE HEADER
────────────────────────────────────────
Large statement              Metadata / action
                              panel
────────────────────────────────────────
Primary content

Supporting evidence          Related records
```

or:

```text
Document                        Verification
preview                         verdict
                                 
                                 evidence
────────────────────────────────────────────
Timeline / signatures / anchor / audit
```

The layout should create a visual reading order rather than a grid of equal boxes.

---

# 4. Typography

Follow the IBM Plex family and semantic type scale already defined in `Claude.md`.

## 4.1 Typography hierarchy

Use typography to create hierarchy before using containers or colour.

### Display / hero

Use Plex Serif sparingly for major moments:

- landing hero
- public verification verdict
- major credential title
- high-value empty states

### UI / body

Use Plex Sans for normal application content.

### Machine-readable data

Use Plex Mono for:

- document IDs
- hashes
- share tokens
- transaction hashes
- wallet/DID/entity IDs
- timestamps when precision matters
- API identifiers
- audit references

The contrast between **editorial prose** and **machine-readable identifiers** is an important part of the brand.

## 4.2 Headlines

Headlines should be specific to the task.

Good:

- `Issue an experience letter`
- `Review Sarah's credential`
- `Verification result`
- `Your verified record`
- `Open opportunities`
- `Organization signing keys`

Avoid:

- `Unlock the future`
- `Trust, reimagined`
- `The future of hiring`
- `Powering verified talent`
- `Everything you need`

No generic startup language.

---

# 5. Colour Strategy

Use the semantic tokens defined in `Claude.md`.

## 5.1 Colour hierarchy

Most of the interface should remain neutral.

The user should notice colour only when it carries meaning:

- navy = navigation, links, focus, identity
- green = verified
- warm amber = pending
- red = revoked / failed
- neutral = expired / inactive
- gold = blockchain anchor / ledger event

Do not use colour simply to make a section more visually interesting.

## 5.2 Primary actions

Primary actions remain ink/black.

Examples:

- `Sign document`
- `Approve credential`
- `Create organization`
- `Generate share link`
- `Run verification`

The colour should not imply verification status.

## 5.3 Status presentation

Never show status with colour alone.

Always use:

```text
[icon] VERIFIED
```

or

```text
[icon] PENDING HR REVIEW
```

The combination of icon + text + semantic colour should make the state obvious even in grayscale.

---

# 6. Surfaces, Rules, and Geometry

The product should feel like a **record system**, not a stack of floating UI cards.

## Prefer

- hairline separators
- strong section rules
- inset wells for machine data
- document frames
- flat panels
- dense but readable tables
- modest 4px geometry

## Avoid

- floating cards everywhere
- heavy shadows
- oversized rounded containers
- decorative glass panels
- glossy surfaces
- glowing containers
- gradients

Elevation should exist only where the interface genuinely sits above the document plane:

- modal
- menu
- toast
- drawer

---

# 7. The CareerVault Signature Motifs

Use a small number of recurring motifs across the product so the system develops a recognizable identity.

## 7.1 Registry numbering

Important screens may use quiet numbering:

```text
01 / ISSUE
02 / REVIEW
03 / SIGN
04 / ANCHOR
05 / VERIFY
```

Use this as orientation, not decoration.

## 7.2 Document metadata rails

For record-heavy pages, use a compact metadata rail:

```text
DOCUMENT
CV-2026-00481

ISSUED
25 SEP 2026, 14:32 IST

ISSUER
Example Technologies

STATUS
VERIFIED
```

This should look like a record excerpt, not a statistic card.

## 7.3 Evidence rails

Whenever a result is displayed, give the user access to the underlying evidence.

For example:

```text
VERIFIED

Content hash       MATCH
Manager signature  VALID
HR signature       VALID
Merkle proof       VALID
Blockchain anchor VALID
Revocation         CLEAR
```

This pattern should become a CareerVault signature component.

## 7.4 Anchor marks

Blockchain references can use a restrained anchor/gold treatment and a small anchor icon.

Example:

```text
ANCHORED
Polygon PoS
Block 84219301
0x8f2...a91
```

The treatment should resemble a ledger stamp, not a crypto token.

---

# 8. Navigation Architecture

## Public navigation

Keep public navigation intentionally small:

```text
CareerVault                     Verify   Sign in   Get started
```

Do not expose every product concept from the header.

## Authenticated navigation

Use role-aware navigation with a stable shell.

Recommended structure:

```text
CareerVault

Workspace
  Overview
  Documents
  Requests
  Activity

Verification
  Verify
  Shared links
  Anchors

Organization
  Members
  Settings
  Security
```

Only expose sections relevant to the current role.

Avoid huge sidebars with 15+ items.

## Role-based difference

The shell should remain visually consistent while the content changes.

Do not create five entirely different dashboard styles for five roles.

---

# 9. Page Archetypes

Every screen should fit one of a small number of visual archetypes.

## Archetype A: Public Editorial Page

Use for:

- homepage
- public product pages
- public verification landing
- onboarding

Composition:

```text
small context label
large editorial statement
supporting copy
primary action + secondary action
proof / evidence / product artifact
```

Do not immediately follow the hero with three identical feature cards.

Show an actual credential, verification result, audit trail, or workflow excerpt instead.

## Archetype B: Registry Dashboard

Use for:

- holder dashboard
- organization dashboard
- recruiter dashboard

Structure:

```text
Page header
Short status summary
────────────────────────────
Primary record list / work queue
────────────────────────────
Supporting metrics / activity
```

The primary content should dominate.

## Archetype C: Record Detail

Use for:

- document detail
- credential detail
- verification detail
- audit event

Structure:

```text
Record title + status
Metadata rail
Main content / document preview
Evidence / signatures / anchor
Timeline / audit history
Actions
```

## Archetype D: Workflow Form

Use for:

- document request
- manager signing
- HR approval
- organization setup

The workflow should feel like progressing through a controlled process, not completing a generic form.

Recommended pattern:

```text
STEP 02 / REVIEW

What you're issuing
[record content]

What will be signed
[evidence / metadata]

────────────────────────
Back                         Continue
```

## Archetype E: Verification Verdict

This is one of the most important product screens.

Structure:

```text
VERIFICATION RESULT

VERIFIED
The credential is authentic and its integrity proof is valid.

────────────────────────
Evidence
✓ Signature
✓ HR approval
✓ Hash
✓ Merkle proof
✓ Blockchain anchor
✓ Current validity
────────────────────────
Document / issuer / dates
────────────────────────
Audit reference
```

The verdict should feel authoritative and calm.

---

# 10. Landing Page Direction

The current landing direction is good but must become more product-evidenced and less marketing-oriented.

## Hero

Keep the large editorial statement, but pair it with a **real product artifact**.

Preferred hero structure:

```text
Career credentials you can
PROVE.

Concise explanation.

[Get started] [Verify a document]

                            ┌─────────────────────┐
                            │ VERIFICATION RESULT │
                            │                     │
                            │ VERIFIED            │
                            │                     │
                            │ 6 checks passed     │
                            │ 0x8f2...a91         │
                            └─────────────────────┘
```

The right side should demonstrate the product, not be abstract decoration.

## Below the hero

Use product evidence in alternating editorial sections:

1. the issuance workflow
2. the verification evidence chain
3. the candidate credential record
4. the organization control layer
5. the technical trust model

Avoid a generic “features” grid.

---

# 11. Public Verification Experience

This is a signature product surface and should receive disproportionate design attention.

## Goal

A recruiter should understand the result in under five seconds.

Then they should be able to inspect the evidence without understanding cryptography.

## Layout

```text
┌─────────────────────────────────────────────────────┐
│ VERIFICATION RESULT                                 │
│                                                     │
│ VERIFIED                              6 / 6 CHECKS │
│                                                     │
│ This credential was issued by Example Technologies │
│ and its integrity proof is valid.                  │
└─────────────────────────────────────────────────────┘

ISSUER
Example Technologies          STATUS
Verified organization         Current

DOCUMENT
Experience Letter              Issued 12 Jun 2026

EVIDENCE
01 Content hash                MATCH
02 Manager signature           VALID
03 HR co-signature             VALID
04 Merkle proof                VALID
05 Blockchain anchor           VALID
06 Revocation / expiry        CLEAR

ANCHOR
Polygon PoS · Block XXXXX · Tx 0x...
```

The result should feel closer to a **security report** or **credential registry** than a consumer SaaS page.

---

# 12. Holder Experience

The holder should feel that CareerVault is a **personal archive of verified professional history**.

## Dashboard

Prioritize:

1. current credentials
2. pending requests
3. sharing / visibility
4. recent verification activity

Avoid making the dashboard primarily a collection of statistic cards.

## Credential cards

A credential should resemble a document index entry:

```text
EXPERIENCE LETTER
Example Technologies
Software Engineer
Jun 2024 — Jun 2026

VERIFIED · ANCHORED
CV-2026-00481

View record      Share
```

The document identity and status should be more prominent than decorative graphics.

---

# 13. Organization / HR Experience

Organizations are managing institutional records. Their experience should feel operational and controlled.

## Admin

Emphasize:

- domain verification
- signer roster
- approver permissions
- key status
- organization security
- audit trail

## HR

The approval queue should feel like a work queue, not a generic card dashboard.

Use:

```text
PENDING REVIEW · 14

Candidate       Document             Requested      Action
Sarah Patel     Experience Letter    2h ago         Review
Rahul Mehta     Salary Proof          5h ago         Review
```

Bulk operations should become visible when useful, not permanently dominate the page.

---

# 14. Manager Signing Experience

Signing is a high-trust action and should feel deliberate.

Do not use a generic “form submit” pattern.

Use a signing ceremony:

```text
REVIEW & SIGN

01  Candidate
02  Document
03  Evidence
04  Sign

────────────────────────────

I confirm that the information above is accurate.

[Digital signature information]

[Sign & submit to HR]
```

After success, show an explicit completion panel with:

- signature status
- signer identity
- timestamp
- next step: HR review

Avoid relying solely on a toast.

---

# 15. Recruiter Experience

The recruiter product should feel like a **verification workspace**, not a social network.

## Candidate discovery

Prioritize:

- search intent
- verified skills
- credential freshness
- issuer evidence
- match explanation

A result should answer:

> Why is this candidate here?

and immediately provide evidence.

Recommended result structure:

```text
AARAV DESAI
Verified Software Engineer

91% match
Python · AWS · React

Evidence
3 verified credentials
2 trusted issuers
Most recent: Jun 2026

Why this match?
→ View explanation
→ View credential evidence
```

Do not make recruiters scroll through large decorative candidate cards.

---

# 16. XAI Design Language

XAI is a core differentiator and must not look like an AI chatbot bolted onto the interface.

## Principle

**Show evidence before commentary.**

The model should explain a ranking or risk score by exposing meaningful contributing factors.

Example:

```text
MATCH SCORE                              92%

Why this candidate matched

Python                               +35
Verified AWS experience              +24
Recent credential                    +18
Issuer trust                         +15
Missing Kubernetes                    -8

[View evidence]
```

The explanation should connect directly to verifiable source records.

## Avoid

- chat bubbles
- robot avatars
- “AI magic” labels
- generated paragraphs with no evidence
- confidence percentages with no definition
- unexplained “smart” badges

If an ML score is used, always show:

1. the score
2. the main contributing factors
3. the evidence behind those factors
4. a concise limitation / caveat where relevant

---

# 17. Document Preview Experience

Documents are the product. Treat their previews as first-class UI.

A document preview should include:

- recognizable paper proportions
- document title
- issuer identity
- recipient identity
- issue date
- signatures
- verification status
- anchor state
- document ID

Do not render PDFs as generic embedded browser objects when a purpose-built summary can make the content easier to understand.

Provide both:

```text
Document view
```

and:

```text
Verification metadata
```

The metadata view should expose the cryptographic record without overwhelming a normal recruiter.

---

# 18. Data-Dense UI Rules

CareerVault will contain tables and operational records. Density is acceptable when hierarchy is strong.

For tables:

- use concise headers
- align numbers consistently
- use mono for IDs / hashes
- avoid oversized rows
- show the most important state in the first visual scan
- keep secondary metadata visually quiet
- provide responsive fallback cards when necessary

Do not turn tables into giant rounded boxes.

---

# 19. Empty, Loading, Error, and Success States

The existing four-state requirement in `Claude.md` is mandatory.

But the states should also feel branded.

## Loading

Skeletons should resemble the eventual information geometry.

## Empty

Explain what is missing and what the user can do next.

Bad:

> No data found.

Better:

> No credentials yet.
> Your issued documents will appear here.
>
> [Request a credential]

## Error

Explain the actual recovery path.

## Success

For high-value operations, use a meaningful completion panel:

```text
ISSUED SUCCESSFULLY

Experience Letter
Sarah Patel

Signed by manager
Approved by HR
Ready for anchoring

[View credential]
```

---

# 20. Motion

Motion should reinforce state and hierarchy, not entertain.

Use motion for:

- route transitions
- drawer / modal entry
- step transitions
- verification progress
- successful signing / issuance
- expanding evidence sections

Do not animate every card on entry.

Do not use:

- parallax
- cursor-following effects
- continuous decorative movement
- bouncing buttons
- animated gradients
- scroll-triggered spectacle

A user should be able to disable motion and lose nothing important.

---

# 21. Copywriting Rules

CareerVault copy should sound like a careful professional system.

## Use

- verify
- issue
- sign
- approve
- revoke
- anchor
- credential
- evidence
- issuer
- holder
- verifier
- record
- status
- audit
- proof

## Avoid

- revolutionize
- unlock
- supercharge
- magic
- seamless
- game-changing
- next-generation
- AI-powered anything
- trustless future
- Web3-native

Do not claim absolute guarantees the system cannot technically prove.

For example, prefer:

> `Tamper-evident verification`

over:

> `Impossible to forge`

---

# 22. Product Substance Must Replace Decoration

A page that feels empty should not be filled with decorative UI.

Instead ask which real product artifact belongs there:

- example credential
- verification result
- audit record
- issuer identity
- document timeline
- signature chain
- anchor reference
- skill evidence
- XAI explanation
- organization security state

This rule is essential to avoiding “vibecoded” output.

---

# 23. Screen-Specific Design Priorities

## Marketing / public

Primary goal: establish credibility quickly.

Priority:

1. real product evidence
2. clear explanation
3. verification demonstration
4. role entry points
5. supporting technical detail

## Holder

Primary goal: maintain and share trusted records.

Priority:

1. credentials
2. status
3. sharing
4. visibility
5. activity

## Manager

Primary goal: issue accurate records efficiently.

Priority:

1. pending requests
2. document editing
3. evidence
4. signing
5. submission status

## HR

Primary goal: validate and control issuance.

Priority:

1. review queue
2. approval context
3. rejection reasons
4. bulk operations
5. auditability

## Organization Admin

Primary goal: establish organizational trust and access control.

Priority:

1. organization verification
2. authorized signers
3. approvers
4. keys/security
5. audit

## Recruiter / Verifier

Primary goal: determine whether a credential and candidate claim are trustworthy.

Priority:

1. search
2. match evidence
3. verification verdict
4. XAI explanation
5. credential details

---

# 24. Responsive Strategy

Design desktop-first because this is a professional web application, but all layouts must remain usable at the four existing validation widths.

## 1440px

Use wide editorial compositions and multi-column evidence views.

## 1024px

Collapse secondary columns before shrinking primary information.

## 768px

Move metadata rails above or below the main record where necessary.

## 375px

Do not simply stack desktop cards.

Prioritize the information hierarchy:

```text
Title
Status
Primary action
Core evidence
Secondary metadata
History
```

Tables should scroll or become cards as already defined by `Claude.md`.

---

# 25. Component Philosophy

Reuse should be high, but components must represent meaningful product concepts.

Good shared components:

- `VerificationVerdict`
- `EvidenceList`
- `RecordHeader`
- `DocumentMetaRail`
- `CredentialRow`
- `SignerChain`
- `AnchorRecord`
- `AuditTimeline`
- `MatchBreakdown`
- `VisibilityControl`
- `WorkflowStepper`
- `StatusBadge`
- `HashDisplay`

Avoid generic components whose only purpose is visual abstraction:

- `FancyCard`
- `GlowPanel`
- `ModernSection`
- `PremiumContainer`
- `GradientHeading`

Build components around **domain meaning**, not aesthetic decoration.

---

# 26. What “Premium” Means in CareerVault

Premium does not mean:

- more gradients
- more animation
- more shadows
- larger rounded cards
- more icons
- more empty space

Premium means:

- precise spacing
- excellent typography
- strong information hierarchy
- excellent copy
- predictable interactions
- meaningful motion
- clear states
- trustworthy evidence presentation
- no visual noise
- no unresolved edge cases

A premium screen should feel finished even when no decoration is present.

---

# 27. Explicit Anti-Vibe-Coding Rules

The following are prohibited for CareerVault unless there is a compelling product-specific reason:

- gradient backgrounds
- neon accents
- glassmorphism
- blurred blobs
- decorative grain
- dot-grid backgrounds
- excessive pills
- excessive rounded cards
- giant icon illustrations
- emoji-based UI
- AI robot imagery
- “magic” copy
- fake testimonials
- fake metrics
- generic feature bento grids
- endless centered sections
- animated gradient buttons
- cursor-following effects
- hover effects on every element
- arbitrary decorative lines
- decorative terminal windows
- decorative browser frames
- fake blockchain visuals unrelated to actual data

One unusual visual treatment is acceptable when it communicates a real concept. Repeated visual novelty is not.

---

# 28. Product Infrastructure Must Be Visible

The product should visibly communicate that it is real infrastructure.

Where appropriate, surface:

- real timestamps
- document IDs
- verification states
- signer identities
- issuer identity
- anchor references
- audit events
- security events
- version history
- privacy controls

Do not hide all of the technical substance behind pretty marketing panels.

CareerVault's technical architecture is part of the user experience.

---

# 29. Implementation Order for the UI Redesign

Do not redesign 25 screens independently.

Use this order.

## Phase 1 — Foundation

1. finalise global typography and spacing
2. establish page shell and navigation
3. establish page-header pattern
4. establish record/evidence primitives
5. establish verification verdict
6. establish document metadata rail
7. establish status and state patterns

## Phase 2 — Public Experience

1. landing page
2. public verification
3. sign in / register
4. onboarding

## Phase 3 — Holder

1. dashboard
2. credential list
3. credential detail
4. sharing / visibility
5. activity

## Phase 4 — Organization

1. organization dashboard
2. members
3. signer management
4. approval queue
5. document workflow
6. audit

## Phase 5 — Recruiter

1. portal home
2. search
3. candidate result list
4. candidate detail
5. match explanation
6. verification evidence

## Phase 6 — Refinement

1. loading states
2. empty states
3. error states
4. success moments
5. responsive pass
6. keyboard pass
7. content polish
8. visual consistency audit

---

# 30. Definition of Done for a Screen

A screen is not finished because it looks good in the happy path.

A screen is finished only when:

- the information hierarchy is obvious within 3 seconds
- the primary action is unambiguous
- the layout reflects the underlying product task
- loading, error, empty, and success states are designed
- important data uses the correct semantic typography
- status semantics are consistent
- no decorative element competes with the primary task
- responsive layouts preserve hierarchy
- keyboard navigation works
- focus states are visible
- copy is specific and believable
- there is no generic AI/SaaS visual pattern
- no placeholder or invented product content remains
- the screen has been checked in a real browser at all required breakpoints

---

# 31. Final Design Test

Before shipping any page, ask:

### Test 1 — Remove all decoration
Would the information architecture still be excellent?

### Test 2 — Remove the brand name
Would the product still feel like a credential / verification system?

### Test 3 — Turn the screen grayscale
Would status and hierarchy still work?

### Test 4 — Ask a recruiter
Can they understand what they are looking at immediately?

### Test 5 — Ask an engineer
Can they identify the evidence and source of a verification result?

### Test 6 — Ask a user
Do they know what to do next without instructions?

If the answer to any of these is no, improve the structure rather than adding visual effects.

---

# North Star

CareerVault should look like **the internet's most carefully designed credential registry**.

It should be unmistakably digital, but carry the visual credibility of a document that matters.

The product should make the user think:

> **“This looks like a system that keeps records seriously.”**

Not:

> “This looks like an AI-generated SaaS website.”
