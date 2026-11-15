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
4. Run `npm run login`. In the window that opens, sign into Supabase and
   `imperialsample@gmail.com`, and clear any PolygonScan check. Then close the window. The
   sessions are kept in `.profile/` (git-ignored).

## Before every production take

1. In `server/`, run `npm run demo:reset-prod`. This wipes production and creates the
   showcase data. It costs one anchor transaction.
2. Don't touch the browser window while it records. Keep the Mac awake, and turn on Do Not
   Disturb so notifications stay off camera.

## Record

```bash
# Rehearse against the local stack (no capture; external evidence skipped):
TARGET=local npm run rehearse

# The real take, on production:
DEMO_PASSWORD='…' TARGET=prod \
  SUPABASE_PROJECT_REF=… SUPABASE_HOST=….supabase.co \
  npm run record
```

The video lands in `out/careervault-demo-prod-<timestamp>.mp4`. Use `--until=5` to stop after
segment 5.

The preflight refuses to start if any of these is true:
- the API isn't healthy (it waits up to 6 minutes for a Render cold start);
- the Supabase project doesn't resolve (it is paused);
- production isn't anchoring on Amoy;
- the anchor wallet holds less than 0.01 POL.
