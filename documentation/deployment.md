# CareerVault — Deploy Runbook (LY final)

> **For:** the four presenters, deploying `ly-final-hardening` to Render + Supabase + Polygon Amoy.
> **Status:** nothing here has been run yet. Every step is a human step on a live account.
> **Rule:** one person drives and reads each step aloud; a second person checks the go/no-go line before you tick the box. Stop at the first no-go.

## Why this order

- **Strict reads and old rows.** This branch turns on `FIELD_ENCRYPTION_STRICT=true` in production. Strict reads refuse any plaintext left in an encrypted column, so if the new code goes live before the Supabase reset, every pre-R10 document fails to read: a 500 in the app and `INVALID` on its public lookup.
- **Old code and the fresh database.** The code on `main` today writes plaintext. If it keeps running while you reset Supabase, anything it writes is plaintext in the new database, and strict mode later refuses it. So the Render service is suspended for the reset and only comes back with the new code.
- **The registry address.** It doesn't exist until step 2, and three things need it: the offline verifier's pin, the docs' `<AMOY_REGISTRY_ADDRESS>` placeholders, and Render's `ANCHOR_REGISTRY_ADDRESS`.
- **Merging deploys.** Render deploys `main` automatically, so the merge (step 9) is itself a deploy. Everything it depends on happens before it.
- **TLS to the database is not on this branch.** `server/certs/` and the Dockerfile copy are ready, but no CA is committed and no URL uses it. It's the optional last step. Don't turn on Supabase's "Enforce SSL" before it's done.

## Before you start

- [ ] A laptop with the repo checked out on **`ly-final-hardening`**, `npm install` done in `server/`, `contracts/` and `tools/verify-credential/`, and `server/.env` present (it's never committed).
- [ ] Access to the Render dashboard (the `careervault-backend` service), the Supabase project, and the team password manager.
- [ ] In the password manager: the anchor wallet's private key, an Alchemy (or QuickNode) **Amoy RPC URL**, an **Etherscan API key**, and Render's `KMS_MASTER_KEY`. Never paste any of these into chat, a commit or a file inside the repo.
- [ ] A **new, non-public demo password** in the password manager, for `SEED_DEMO_PASSWORD` (step 6).
- [ ] About two hours, with no one using the deployed site.

The anchor wallet is `0x955cE8960A1Fb6fCCd9e5F42D81a844dEDf5056e`. That address is public; its key is not.

---

## Step 1 — Fund the anchor wallet

- [ ] Claim test POL for `0x955cE8960A1Fb6fCCd9e5F42D81a844dEDf5056e` from the Amoy faucets, one teammate each per day: [Alchemy](https://www.alchemy.com/faucets/polygon-amoy), [QuickNode](https://faucet.quicknode.com/polygon/amoy), [ETHGlobal](https://ethglobal.com/faucet/polygon-amoy-80002), [Chainlink](https://faucets.chain.link/polygon-amoy). The old faucet.polygon.technology no longer serves Amoy.
- [ ] Check the balance with a read-only RPC call. `$POLYGON_RPC_URL` is the Amoy RPC URL, exported in your shell only:

  ```bash
  curl -s -X POST "$POLYGON_RPC_URL" -H 'content-type: application/json' \
    --data '{"jsonrpc":"2.0","id":1,"method":"eth_getBalance","params":["0x955cE8960A1Fb6fCCd9e5F42D81a844dEDf5056e","latest"]}' \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(Number(BigInt(JSON.parse(s).result))/1e18,"POL"))'
  ```

- **Expected:** a number such as `0.5 POL`.
- **Go/no-go:** at least **0.2 POL**. The deploy costs roughly 0.05 POL and each anchor roughly 0.005; the server warns below 0.05. Below 0.2, keep claiming.
- **Rollback:** none needed; this step only reads.

## Step 2 — Deploy and verify the registry

- [ ] Put `POLYGON_RPC_URL`, `ANCHOR_PRIVATE_KEY` and `ETHERSCAN_API_KEY` in `contracts/.env` (template: `contracts/.env.example`).
- [ ] Deploy:

  ```bash
  cd contracts && npm run deploy:amoy
  ```

  **Expected:** `AnchorRegistry deployed to: 0x…`, a PolygonScan address link, the deployment tx, `Deployment record written to: …/deployments/amoy.json` and `ANCHOR_REGISTRY_ADDRESS=0x…`. It waits for 5 confirmations, so allow a minute.
- [ ] Verify the source on PolygonScan:

  ```bash
  npm run verify:amoy
  ```

  **Expected:** `Verified: 0x…` (or `Already verified: 0x…`) and `PolygonScan: https://amoy.polygonscan.com/address/0x…`.
- **Go/no-go:** the PolygonScan page shows the contract with a **verified source** tick, and `contracts/deployments/amoy.json` has `chainId: 80002`, the `address`, and a `blockNumber`.
- **Rollback:** a deployed contract can't be removed. If the deploy fails part-way, fix the cause and run it again: you lose only the gas. If you deploy twice, use the newer `amoy.json` everywhere and ignore the first contract.

## Step 3 — Record the address everywhere

- [ ] Commit the deployment record on `ly-final-hardening`:

  ```bash
  git add contracts/deployments/amoy.json
  git commit -m "chore(contracts): record the Amoy AnchorRegistry deployment"
  ```

- [ ] Pin it in the offline verifier: in `tools/verify-credential/verify-credential.mjs`, set `KNOWN_REGISTRIES[80002]` to the `address` from `amoy.json`, exactly as written there.
- [ ] Fill the placeholders:

  ```bash
  grep -rln "<AMOY_REGISTRY_ADDRESS>" README.md documentation server/CLAUDE.md tools \
    | xargs sed -i '' "s/<AMOY_REGISTRY_ADDRESS>/0xYOUR_ADDRESS/g"
  ```

  That is macOS `sed`; on Linux, drop the `''`. Then reread the sentences that explain the placeholder and reword them: the viva guide's header, L8, the end of Q20 and section 10, and the README's contract row.
- [ ] Note the deploy block for step 4: `node -p "require('./contracts/deployments/amoy.json').blockNumber"`.
- [ ] Check the verifier still passes its vectors: `cd tools/verify-credential && node verify-credential.mjs --selftest` ends in 14 ✓ lines and exits 0.
- [ ] Commit: `git commit -am "docs: pin the Amoy AnchorRegistry address"`.
- **Go/no-go:** `grep -rn "<AMOY_REGISTRY_ADDRESS>" README.md documentation server/CLAUDE.md tools` prints nothing, and the selftest exits 0.
- **Rollback:** `git revert` the two commits.

## Step 4 — Set the Render environment

In the Render dashboard, open `careervault-backend` → **Environment**.

- [ ] Set these secrets. None of them is in `render.yaml`:
  - `POLYGON_RPC_URL`: the Amoy RPC URL.
  - `ANCHOR_PRIVATE_KEY`: the anchor wallet's key, `0x` + 64 hex characters.
  - `ANCHOR_REGISTRY_ADDRESS`: the `address` from `amoy.json`. The boot rejects a mixed-case address with a bad checksum, so paste it exactly.
  - `ANCHOR_REGISTRY_DEPLOY_BLOCK`: the `blockNumber` from step 3. It lets a batch that retries after a restart look up the anchoring transaction.
- [ ] **Is the service Blueprint-synced?** Render applies `render.yaml` only to services a Blueprint manages. Look under **Blueprints** in the dashboard: if the service is listed there with sync on, `render.yaml` applies when you merge. If it isn't listed, the service was created by hand and `render.yaml` never applies, so set these by hand too:
  - `BLOCKCHAIN_DRIVER=amoy`
  - `FIELD_ENCRYPTION_STRICT=true`
  - Check the rest match `render.yaml`: `NODE_ENV=production`, `WORKER=true`, `STORAGE_LOCAL_DIR=/app/server/storage`, and under **Disks** a disk mounted at `/app/server/storage`. Without that disk, every deploy wipes the org signing keys and the PDFs.
- [ ] Confirm `KMS_MASTER_KEY` is set, and that the team holds an **offline** copy of it, for example in the password manager. Losing it makes every org signing key, every encrypted field and every stored PDF unreadable, and you'll use it on the laptop in steps 6 and 7.
- [ ] Confirm `DEMO_MASTER_PASSWORD_ENABLED` is unset or `false`.
- **Go/no-go:** all four secrets are saved, and `KMS_MASTER_KEY` has a known offline backup.
- **If Render redeploys when you save** (choose **Save only** if it offers the choice): the old code on `main` ignores the four secrets, but it has only the local blockchain driver, so with `BLOCKCHAIN_DRIVER=amoy` set by hand it fails to boot. That's expected and harmless: step 5 suspends the service next, and step 10 brings it back on the new code.
- **Rollback:** delete the four secrets, or set `BLOCKCHAIN_DRIVER=local` to fall back to the simulator.

## Step 5 — Suspend the Render service

- [ ] `careervault-backend` → **Settings** → **Suspend Web Service**.
- **Expected:** the service shows **Suspended**, and `https://<render-host>/api/v1/health` no longer answers.
- **Go/no-go:** suspended. Nothing may write to Supabase from here until step 10.
- **Rollback:** **Resume** (the old code comes back on the old database).

## Step 6 — Reset and re-seed Supabase from the laptop

This destroys every row in the Supabase database. It's the user-approved reset. If you want anything from the old database, `pg_dump` it first. That dump holds pre-R10 plaintext, so keep it off shared drives and delete it afterwards.

- [ ] In one shell, from `server/`, export **both** Supabase URLs and **Render's** master key. `prisma.config.ts` connects the CLI with `DIRECT_URL ?? DATABASE_URL`, while the seed writes through `DATABASE_URL`, and a `DIRECT_URL` left in `server/.env` would reset *that* database instead:

  ```bash
  cd server
  export DATABASE_URL='<Supabase transaction pooler URL, port 6543>'
  export DIRECT_URL='<Supabase session pooler URL, port 5432>'
  export KMS_MASTER_KEY='<Render KMS_MASTER_KEY>'
  export SEED_DEMO_PASSWORD='<the new non-public demo password>'
  export STORAGE_LOCAL_DIR="$(mktemp -d)"
  node -e 'for (const k of ["DATABASE_URL","DIRECT_URL"]) console.log(k, new URL(process.env[k]).host)'
  ```

- [ ] **Check the two hosts it prints are the Supabase project's.** If either says `localhost`, stop.
- [ ] Reset, then seed. Prisma 7's reset doesn't run the seed itself:

  ```bash
  npx prisma migrate reset --force
  npm run db:seed
  ```

- **Expected:** the reset lists every migration in `prisma/migrations` as applied, and the seed ends with `Seed complete.` and `Staff/holders (password the SEED_DEMO_PASSWORD you set):`. The seed never prints a password it read from the environment.
- **Go/no-go:** both commands exit 0. Rows sealed under any other key would be undecryptable on Render, so if you aren't sure the exported `KMS_MASTER_KEY` is Render's, stop and re-check before step 7.
- **Rollback:** none; the reset is destructive. Re-run this step to start again.

Keep this shell open for step 7.

## Step 7 — Audit the database encryption

- [ ] In the same shell:

  ```bash
  npm run db:audit-encryption
  ```

- **Expected:** count tables for the encrypted database fields and a storage section, ending in `PASS: every value is encrypted or null.`
- **Go/no-go:** `PASS` and exit 0. Strict mode needs this: in production, any row reported as plaintext is refused at read time.
- **Caveat:** the storage section reads the **laptop's** `STORAGE_LOCAL_DIR/objects`, which is the empty temporary directory from step 6. It doesn't audit Render's disk, whose runtime image can't run this script. Step 11 clears Render's disk instead.
- **Rollback:** on `FAIL`, don't continue. Redo step 6, checking the exported `KMS_MASTER_KEY` and both URLs.
- [ ] Then `unset KMS_MASTER_KEY SEED_DEMO_PASSWORD DATABASE_URL DIRECT_URL` and close the shell.

## Step 8 — Supabase: turn off the Data API

- [ ] Supabase dashboard → **Project Settings** → **Data API**: turn it off, or at least remove `public` from **Exposed schemas**. Prisma connects directly and nothing uses the REST API, but it would serve every table without row-level security.
- [ ] Check: `curl -s "https://<project-ref>.supabase.co/rest/v1/documents?select=id&limit=1" -H "apikey: <anon key>"`.
- **Expected:** an error object, not a JSON array of rows.
- **Go/no-go:** no rows come back.
- **Rollback:** turn the Data API back on.
- **Don't** switch on "Enforce SSL" here. That waits for the optional TLS step at the end.

## Step 9 — Merge and push

- [ ] Merge `ly-final-hardening` into `main` and push. Because the service is suspended, nothing runs yet. When it does, `start.sh` runs `prisma migrate deploy` before the app starts.
- **Go/no-go:** `main` on GitHub is at the merge commit.
- **Rollback:** revert the merge on `main`. The reset database is now sealed under R10, though, so the old code would show envelope text instead of content. From here the fallback is the laptop stack (viva guide §9.3), not the old code.

## Step 10 — Resume on the new code and read the boot log

- [ ] **Settings** → **Resume Web Service**. Then open **Events**. If the deploy that starts isn't the merge commit, click **Manual Deploy** → **Deploy latest commit** straight away. Nobody uses the app until the merge commit shows **Deploy live**.
- [ ] In **Logs**, find each of these lines:
  - `==> Running Prisma migrations...`, then `No pending migrations to apply.`
  - the production-driver banner listing **only** `DNS_DRIVER=local`, `PAYMENT_DRIVER=mock`, `EMAIL_DRIVER=console` (unless you set Gmail) and `KEY_MANAGEMENT_DRIVER=local`. If it also lists `BLOCKCHAIN_DRIVER=local`, `FIELD_ENCRYPTION_STRICT=false` or `DEMO_MASTER_PASSWORD_ENABLED=true`, step 4's settings didn't apply.
  - `Anchoring to polygon-amoy (chainId 80002) via AnchorRegistry 0x… from wallet 0x955cE8960A1Fb6fCCd9e5F42D81a844dEDf5056e`
  - `Self-check OK — RPC chainId 80002, ANCHOR_CHAIN_ID 80002`
  - `Self-check OK — contract code at 0x…`
  - `Self-check OK — wallet 0x955cE8960A1Fb6fCCd9e5F42D81a844dEDf5056e is an authorized anchor`
  - `wallet balance … POL`, with no `below 0.05 POL` warning
  - `CareerVault API on http://localhost:9900/api/v1`. This means the field-encryption canary passed: when it fails, the boot stops with `Field encryption self-test failed: …` instead.
- [ ] `curl -s https://<render-host>/api/v1/health` returns `"status":"ok"`.
- **Go/no-go:** every line above is present, and there is no `Self-check FAILED`.
- **Rollback:** fix the environment (step 4) and redeploy. A wrong `KMS_MASTER_KEY` shows up as that self-test failure, or later as `ENCRYPTION_KEY_UNAVAILABLE` 503s: restore the key that sealed step 6's rows.

## Step 11 — Clear the stale Render-disk artefacts

Do this **before any document is signed** on the new stack: step 12 creates new org keys and PDFs on the same disk.

- [ ] **Shell** tab on the service:

  ```bash
  ls -la /app/server/storage /app/server/storage/kms /app/server/storage/objects/documents
  find /app/server/storage/kms -name '*.key' ! -name master.key -print -delete
  rm -rf /app/server/storage/objects/documents
  rm -f /app/server/storage/chain/ledger.json
  ```

  These are the pre-R10 plaintext PDFs, org key files that no reset organisation points at, and the local simulator's ledger. Leave `master.key` alone: with `KMS_MASTER_KEY` set it's never read.
- **Expected:** the `find` prints the deleted key files, and `ls /app/server/storage/objects` then shows no `documents` directory.
- **Go/no-go:** no old PDF or org key file remains.
- **Rollback:** none needed. Nothing in the reset database refers to these files.

## Step 12 — Rehearse, then verify offline

- [ ] Follow the viva guide's click path (§9.2): make 3–4 requests as Alice, sign each as Marcus, approve each as Hannah, click **Anchor now** as Olivia, then revoke one as Hannah. Everyone signs in with the step-6 password.
- [ ] **Expected:** the Anchor now toast shows the transaction. PolygonScan shows **Success** and a `RootAnchored` event. `/verify/hash/<hash>` shows `VERIFIED` for the anchored documents and `REVOKED` for the revoked one.
- [ ] Download the credential of an anchored document as its holder, and run:

  ```bash
  cd tools/verify-credential && node verify-credential.mjs careervault-credential-<id>.jsonld --explain
  ```

  **Expected:** every line ✓, including `Registry` (now pinned), and exit 0. For the revoked document's credential, run it again once PolygonScan shows the `DocumentRevoked` event. Expect `✗ On-chain revocation` and a `✗ REVOKED` summary, exit 1. The chain write is fire-and-forget after the database revocation, and nothing retries a failed one, so check the event exists before you demo this.
- [ ] **Live checks:**
  - Sign in as `admin@techcorp.example.com` with `Password123@`. It must fail with **Invalid credentials**: the master password is off, and the seeded password isn't the published one.
  - The Supabase REST check from step 8 still returns no rows.
- **Go/no-go:** all of the above. Then keep one downloaded credential and one PolygonScan transaction page as fallbacks (viva guide §9.1, step 10).
- **Rollback:** to repeat the rehearsal from a clean database, redo steps 5–7 and 10–11.

---

## Optional — TLS to the database, then "Enforce SSL"

Only after step 12 passes. Don't enforce SSL on Supabase until both connection strings below work.

- [ ] Supabase → **Project Settings** → **Database** → **SSL Configuration** → **Download certificate**. Save it as `server/certs/supabase-ca.crt` and commit it: it's a public CA certificate, and the Dockerfile copies `server/certs` into the image ([server/certs/README.md](../server/certs/README.md)).
- [ ] **Test both URLs from the laptop first**, with the certificate's local path:
  - Runtime (`pg` driver): append `sslmode=verify-full&sslrootcert=<path to supabase-ca.crt>` to the pooler URL and run `npm run db:audit-encryption` with it as `DATABASE_URL`. It must still end in `PASS`. The installed `pg-connection-string` treats plain `require` as `verify-full`, so `require` without the CA fails.
  - Migrations (Prisma CLI): append `sslmode=require&sslcert=<absolute path to supabase-ca.crt>` to the session URL and run `npx prisma migrate status` with it as `DIRECT_URL`. Expect `Database schema is up to date!`. The CLI has its own parameter names, so don't copy the runtime ones.
- [ ] Merge the certificate commit and let it deploy. Then set Render's `DATABASE_URL` to use `sslrootcert=/app/server/certs/supabase-ca.crt` and `DIRECT_URL` to use `sslcert=/app/server/certs/supabase-ca.crt`, with the parameters above. Check step 10's log lines and health again.
- [ ] Only then: Supabase → **SSL Configuration** → **Enforce SSL on incoming connections**.
- **Go/no-go:** the service boots and verifies documents after the change.
- **Rollback:** turn off Enforce SSL, and restore the previous `DATABASE_URL` and `DIRECT_URL`.
