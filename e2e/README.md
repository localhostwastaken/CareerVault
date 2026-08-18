# CareerVault end-to-end tests

Browser tests covering the journey the product exists for: an organisation is founded and
verified, staff and employees join it, an employee requests a document, and that document is
drafted, signed, co-signed, issued, anchored, shared, publicly verified and revoked.

Two of these files are regression nets for specific production failures and should be read
as such — `auth-session.spec.ts` (the sign-in screen flashing on reload) and
`document-lifecycle.spec.ts` (a manager's signature never reaching HR).

## Running

```bash
npm install
npm run install:browsers   # once, downloads Chromium
npm test
```

Postgres with the `pgvector` extension must be reachable using the credentials in
`server/.env`; everything else the suite starts itself.

- `npm run test:headed` — watch it drive a real browser
- `npm run test:ui` — Playwright's interactive runner
- `npm run report` — open the HTML report from the last run

## What it does to your machine

Nothing that touches your development data. The suite boots **its own** API and Vite server
on ports the dev stack does not use, against **its own** database:

| | dev | e2e |
|---|---|---|
| API | 9900 | 9901 |
| Client | 5173 | 5273 |
| Database | `careervault` | `careervault_e2e` (created on first run) |
| Key store / PDFs | `server/storage` | `server/storage-e2e` |

Every adapter runs on its local or mock driver, so no email, payment provider, blockchain RPC
or AI service is contacted. `NODE_ENV=test` also disables rate limiting — see
`TestEnvThrottlerGuard`; without it a suite that registers a handful of accounts would trip
the 5-per-minute registration throttle on its second run.

The demo seed is deliberately **not** loaded. Each spec creates the organisation and people
it needs, with a run-unique slug, so tests never collide on the unique email and org-domain
constraints and never depend on fixture data drifting underneath them.

## Rules worth knowing before adding a test

These are properties of the product, not of the harness, and ignoring them produces tests
that fail for reasons unrelated to what they are checking:

- **The founder's email host must equal the organisation's domain.** `admin@acme.test` can
  found `acme.test` and nothing else.
- **Give managers and HR a password before adding them as members.** Member-add emails a
  magic link to anyone without one, and a test cannot read email.
- **An organisation must be verified and have at least one manager** before any document can
  be requested from it.
- **The approver must be a different person than the signer.** That is the product's central
  guarantee, and the server enforces it.
- **Personas live in `sessionStorage`**, so each role needs its own `BrowserContext`. Sharing
  one makes two roles fight over the same active persona.
- **Leave "Enable AI skill extraction" unchecked** unless the AI service is running —
  approval waits on it with a 35-second timeout.
- Prefer role- and label-based locators. Where a name is ambiguous (`Designation` is a prefix
  of `Signatory designation`), pass `exact: true` rather than reaching for a CSS selector.
