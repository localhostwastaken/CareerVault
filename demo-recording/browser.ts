import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium, type BrowserContext } from 'playwright'
import { WINDOW } from './config.js'

export const PROFILE_DIR = new URL('./.profile/', import.meta.url).pathname
export const OUT_DIR = new URL('./out/', import.meta.url).pathname

// Chrome's "Save password?" bubble is browser UI, not page content: nothing in the take can
// close it and the screen capture films it over every signed-in screen (it even offers to
// save the step-up answers). Turn the password manager off in the profile before launch.
function disablePasswordManager(): void {
  const file = `${PROFILE_DIR}Default/Preferences`
  mkdirSync(`${PROFILE_DIR}Default`, { recursive: true })
  const prefs = existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>) : {}
  const profile = (prefs.profile ?? {}) as Record<string, unknown>
  prefs.credentials_enable_service = false
  prefs.profile = { ...profile, password_manager_enabled: false, password_manager_leak_detection: false }
  writeFileSync(file, JSON.stringify(prefs))
}

// One persistent profile: a team member signs into Supabase and Gmail here once
// (`npm run login`), and the take reuses those sessions. Claude never sees those passwords.
export async function openBrowser(opts: { baseURL?: string; recordVideo: boolean }): Promise<BrowserContext> {
  mkdirSync(PROFILE_DIR, { recursive: true })
  mkdirSync(OUT_DIR, { recursive: true })
  disablePasswordManager()
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    baseURL: opts.baseURL,
    viewport: null,
    acceptDownloads: true,
    // A faithful backup of every tab's content, independent of what covers the window on
    // screen; the screen capture is the primary (it shows the real URL bar).
    // Never on for `npm run login`, which must not film anyone signing in.
    recordVideo: opts.recordVideo ? { dir: `${OUT_DIR}page-video/`, size: { width: 1408, height: 704 } } : undefined,
    permissions: ['clipboard-read', 'clipboard-write'],
    args: [
      `--window-position=${WINDOW.x},${WINDOW.y}`,
      `--window-size=${WINDOW.width},${WINDOW.height}`,
      '--hide-crash-restore-bubble',
      '--disable-features=Translate',
    ],
  })
  return context
}

// The screen capture records a fixed region, so the take's window must be in front of
// everything else. Activating the app bundle does that without opening a new window.
let active = false
/** Turns on window activation; only a real capture needs the window in front. */
export function keepInFront(): void {
  active = true
}

export function bringToFront(): Promise<void> {
  if (!active) return Promise.resolve()
  const app = chromium.executablePath().replace(/\.app\/Contents\/.*$/, '.app')
  return new Promise((resolve) => execFile('open', ['-a', app], () => resolve()))
}
