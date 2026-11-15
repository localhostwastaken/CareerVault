import { mkdirSync } from 'node:fs'
import { chromium, type BrowserContext } from 'playwright'
import { WINDOW } from './config.js'

export const PROFILE_DIR = new URL('./.profile/', import.meta.url).pathname
export const OUT_DIR = new URL('./out/', import.meta.url).pathname

// One persistent profile: a team member signs into Supabase and Gmail here once
// (`npm run login`), and the take reuses those sessions. Claude never sees those passwords.
export async function openBrowser(baseURL?: string): Promise<BrowserContext> {
  mkdirSync(PROFILE_DIR, { recursive: true })
  mkdirSync(OUT_DIR, { recursive: true })
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    baseURL,
    viewport: null,
    acceptDownloads: true,
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
