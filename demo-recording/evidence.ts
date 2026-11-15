// Integration evidence, opened as new tabs inside the same take. Gmail is not among them:
// Google refuses sign-in in a script-controlled browser, so the issuance email is captured
// as a still from a normal browser instead (see demo-guide/talk-track.html). Best-effort by design: a
// third-party page that changed its layout must not cost a whole take, so each step logs
// what it skipped instead of throwing. A local rehearsal skips them all.
import type { BrowserContext, Page } from 'playwright'
import { bringToFront } from './browser.js'
import { AMOY, HOLD } from './config.js'

export interface Evidence {
  supabaseStorage(): Promise<void>
  supabaseTable(): Promise<void>
  polygonTx(txUrl: string | null): Promise<void>
  polygonEvents(): Promise<void>
}

export const noEvidence: Evidence = {
  supabaseStorage: async () => console.log('  (skipped Supabase storage on local)'),
  supabaseTable: async () => console.log('  (skipped Supabase table on local)'),
  polygonTx: async () => console.log('  (skipped PolygonScan on local)'),
  polygonEvents: async () => console.log('  (skipped PolygonScan events on local)'),
}

async function show(context: BrowserContext, url: string, act?: (page: Page) => Promise<void>): Promise<void> {
  const page = await context.newPage()
  await bringToFront()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await hideCookieBanner(page)
    await page.waitForTimeout(HOLD.read)
    if (act) await act(page)
    await page.waitForTimeout(HOLD.talk)
  } catch (error) {
    console.log(`  (evidence step on ${new URL(url).host} incomplete: ${(error as Error).message.split('\n')[0]})`)
  } finally {
    await page.close()
  }
}

// PolygonScan's banner offers only "Got it!", which agrees to its cookie terms. That is not the
// take's call to make, so the banner is hidden in this tab instead and no consent is given.
async function hideCookieBanner(page: Page): Promise<void> {
  await page.addStyleTag({ content: '#masterDivCookie { display: none !important; }' }).catch(() => {})
}

export function liveEvidence(context: BrowserContext, opts: { supabaseRef: string | null; bucket: string }): Evidence {
  const dashboard = opts.supabaseRef ? `https://supabase.com/dashboard/project/${opts.supabaseRef}` : null
  return {
    supabaseStorage: async () => {
      if (!dashboard) return console.log('  (no SUPABASE_PROJECT_REF; skipped storage)')
      // Issued PDFs live at objects/documents/<document id>.pdf (sealed by EncryptedStorageService).
      await show(context, `${dashboard}/storage/buckets/${opts.bucket}`, async (page) => {
        await page.getByText('objects', { exact: true }).first().click()
        await page.waitForTimeout(HOLD.beat)
        await page.getByText('documents', { exact: true }).first().click()
        await page.waitForTimeout(HOLD.read)
      })
    },
    supabaseTable: async () => {
      if (!dashboard) return console.log('  (no SUPABASE_PROJECT_REF; skipped table)')
      await show(context, `${dashboard}/editor`, async (page) => {
        // The table list entries are links styled as buttons, so match the visible name.
        await page.getByText('documents', { exact: true }).first().click()
        await page.getByRole('columnheader', { name: /^status/ }).waitFor({ timeout: 20_000 })
        await page.getByRole('button', { name: 'Close banner' }).click({ timeout: 2_000 }).catch(() => {})
        await page.waitForTimeout(HOLD.read)
        // Scroll right to content_json: every value is a "cvenc:v1:…" envelope, not plaintext.
        await page.mouse.move(700, 350)
        await page.mouse.wheel(900, 0)
      })
    },
    polygonTx: async (txUrl) => {
      if (txUrl) await show(context, txUrl)
      await show(context, `${AMOY.explorer}/address/${AMOY.contract}#readContract`, async (page) => {
        // The Read Contract tab lives in an iframe. The take copied the root (bytes32) in the app.
        const frame = page.frameLocator('iframe#readcontractiframe')
        await frame.getByText('verifyRoot').first().click()
        await page.waitForTimeout(HOLD.beat)
        await frame.locator('input[placeholder^="rootHash" i]').first().click()
        await page.keyboard.press('Meta+V')
        await page.waitForTimeout(HOLD.beat)
        await frame.getByRole('button', { name: 'Query' }).first().click()
        // The chain's own answer: exists = true, the document count and the anchoring wallet.
        await frame.getByText('anchoredBy').first().waitFor({ timeout: 15_000 })
        await frame.getByText('anchoredBy').first().scrollIntoViewIfNeeded()
        await page.waitForTimeout(HOLD.read)
      })
    },
    polygonEvents: () => show(context, `${AMOY.explorer}/address/${AMOY.contract}#events`),
  }
}
