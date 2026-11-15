# Demo recording

One continuous, scripted take of CareerVault for the presentation, captured off the screen
with ffmpeg. You narrate live over it. The design is in
`docs/superpowers/specs/2026-11-14-presentation-scope-cut-design.md` (§6.5); what to say is in
`demo-guide/talk-track.html`.

## One-time setup

1. Run `npm install` in this folder.
2. Run `brew install ffmpeg` if it isn't installed.
3. Grant Screen Recording permission to your terminal: System Settings → Privacy & Security →
   Screen Recording. Restart the terminal afterwards.
4. Run `npm run login`. In the window that opens, sign into Supabase and clear any
   PolygonScan check. Then close the window. The session is kept in `.profile/` (git-ignored).
   Gmail is not part of the take: Google refuses sign-in in a script-controlled browser, so
   the issuance email is captured as a still from a normal browser after the take.

## Before every production take

1. In `server/`, run `npm run demo:reset-prod`. The first run only prints the database host
   it would wipe and refuses. Re-run it as `CONFIRM_RESET_HOST=<that host> npm run
   demo:reset-prod` to wipe production and create the showcase data. It costs one anchor
   transaction. The seeded accounts get the non-public `SEED_DEMO_PASSWORD` from
   `server/.env.production.local`.
2. Don't touch the browser window while it records. Keep the Mac awake, and turn on Do Not
   Disturb so notifications stay off camera.

## Record

```bash
# Rehearse against the local stack (no capture; external evidence skipped):
TARGET=local npm run rehearse

# The real take, on production:
TARGET=prod SUPABASE_PROJECT_REF=… SUPABASE_HOST=….supabase.co npm run record
# The password is read from server/.env.production.local (SEED_DEMO_PASSWORD), never typed.
```

The video lands in `out/careervault-demo-prod-<timestamp>.mp4`. Use `--until=5` to stop after
segment 5.

The preflight refuses to start if any of these is true:
- the API isn't healthy (it waits up to 6 minutes for a Render cold start);
- the Supabase project doesn't resolve (it is paused);
- production isn't anchoring on Amoy;
- the anchor wallet holds less than 0.01 POL.
