// Runs the continuous demo take.
//   TARGET=local npm run rehearse          no capture, external evidence skipped
//   DEMO_PASSWORD=… TARGET=prod npm run record
// Optional: --from=<n> / --until=<n> run a slice (DOC_ID supplies the take's document when
// starting after segment 3); SUPABASE_PROJECT_REF / SUPABASE_STORAGE_BUCKET
// enable the Supabase cut-ins; SUPABASE_HOST enables the paused-project preflight check.
import { startCapture } from './capture.js'
import { OUT_DIR, openBrowser } from './browser.js'
import { TARGETS, type Target } from './config.js'
import { liveEvidence, noEvidence } from './evidence.js'
import { installOverlay } from './overlay.js'
import { preflight } from './preflight.js'
import { SEGMENTS, type TakeContext } from './segments.js'

const target = (process.env.TARGET ?? 'local') as Target
const capture = !process.argv.includes('--no-capture')
const from = Number(process.argv.find((a) => a.startsWith('--from='))?.split('=')[1] ?? 1)
const until = Number(process.argv.find((a) => a.startsWith('--until='))?.split('=')[1] ?? SEGMENTS.length)
// Local rehearsals use the published seed default; production reads it from the environment.
const password = process.env.DEMO_PASSWORD ?? (target === 'local' ? 'Password123@' : '')
if (!password) throw new Error('Set DEMO_PASSWORD for a production take')

const check = await preflight(target)
if (!check.ok) {
  console.error(`Preflight failed: ${check.reason}`)
  process.exit(1)
}

const context = await openBrowser(TARGETS[target].app)
// The profile is persistent (for the Supabase and Gmail sessions), so a CareerVault session
// left by an earlier take would skip the sign-in screen. Start every take signed out.
for (const url of [TARGETS[target].app, TARGETS[target].api]) {
  await context.clearCookies({ domain: new URL(url).hostname })
}
await installOverlay(context)
const page = context.pages()[0] ?? (await context.newPage())
await page.goto('/')
await page.waitForTimeout(1_500)

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
const recording = capture ? startCapture(`${OUT_DIR}careervault-demo-${target}-${stamp}.mp4`) : null
const take: TakeContext = {
  page,
  context,
  password,
  outDir: OUT_DIR,
  // Resuming a rehearsal mid-take: the document segment 3 would have discovered.
  documentId: process.env.DOC_ID,
  evidence:
    target === 'local'
      ? noEvidence
      : liveEvidence(context, {
          supabaseRef: process.env.SUPABASE_PROJECT_REF ?? null,
          bucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'careervault-storage',
        }),
}

let failed = false
try {
  for (const [index, segment] of SEGMENTS.entries()) {
    if (index + 1 < from || index + 1 > until) continue
    console.log(`Segment ${index + 1}: ${segment.name}`)
    await segment(take)
  }
} catch (error) {
  failed = true
  console.error(`Take stopped: ${(error as Error).message.split('\n').slice(0, 12).join('\n')}`)
  await page.screenshot({ path: `${OUT_DIR}failure-${stamp}.png` }).catch(() => {})
} finally {
  await recording?.stop()
  await context.close()
}
process.exit(failed ? 1 : 0)
