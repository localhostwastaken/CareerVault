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
or AI service is contacted (chain mode, below, is the one opt-in exception). `NODE_ENV=test`
also disables rate limiting — see
`TestEnvThrottlerGuard`; without it a suite that registers a handful of accounts would trip
the 5-per-minute registration throttle on its second run.

The demo seed is deliberately **not** loaded. Each spec creates the organisation and people
it needs, with a run-unique slug, so tests never collide on the unique email and org-domain
constraints and never depend on fixture data drifting underneath them.

## Chain mode (opt-in)

`npm test` anchors into the API's local JSON-ledger simulator. `npm run test:chain` runs the
document lifecycle against a real `AnchorRegistry` instead, through the same
`PolygonAnchorService` a deploy uses — anchored by `/merkle/run`, then verified on-chain —
on a local Hardhat node, so nothing is sent to a public network.

```bash
# terminal 1 — a local chain (chainId 31337); leave it running
cd contracts && npx hardhat node

# terminal 2 — deploy the registry to it, then run the spec
cd contracts && npm run deploy:localhost
export E2E_CHAIN_RPC_URL=http://127.0.0.1:8545
export E2E_ANCHOR_REGISTRY_ADDRESS=$(node -p "require('./deployments/localhost.json').address")
# Hardhat's default account #0, which deployed the registry and so is an authorized anchor.
# It is public and well known: fine for a local node, never for a real network.
export E2E_ANCHOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
cd ../e2e && npm run test:chain
```

- Setting all three `E2E_*` variables switches the API to `BLOCKCHAIN_DRIVER=amoy` with one
  confirmation and no tip floor; `E2E_CHAIN_ID` overrides the default `31337`. Setting only
  some of them is an error, and `test:chain` refuses to start without them rather than
  quietly passing against the simulator.
- Stop any API already listening on 9901 first. Outside CI Playwright reuses a running
  server, and one started in simulator mode would turn this run into a no-op.
- The API log that Playwright prints opens with the adapter's self-check: the chain id, the
  contract code, the wallet's anchor authorization and its balance (address only, never the
  key).

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
