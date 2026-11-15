// Integration evidence, opened as new tabs inside the same take. Best-effort by design: a
// third-party page that changed its layout must not cost a whole take, so each step logs
// what it skipped instead of throwing. A local rehearsal skips them all.
import type { BrowserContext, Page } from 'playwright'
import { bringToFront } from './browser.js'
import { AMOY, GMAIL_SEARCH, HOLD } from './config.js'

export interface Evidence {
  supabaseStorage(): Promise<void>
  supabaseTable(): Promise<void>
  gmail(): Promise<void>
  polygonTx(txUrl: string | null): Promise<void>
  polygonEvents(): Promise<void>
}

export const noEvidence: Evidence = {
  supabaseStorage: async () => console.log('  (skipped Supabase storage on local)'),
  supabaseTable: async () => console.log('  (skipped Supabase table on local)'),
  gmail: async () => console.log('  (skipped Gmail on local)'),
  polygonTx: async () => console.log('  (skipped PolygonScan on local)'),
  polygonEvents: async () => console.log('  (skipped PolygonScan events on local)'),
}

async function show(context: BrowserContext, url: string, act?: (page: Page) => Promise<void>): Promise<void> {
  const page = await context.newPage()
  await bringToFront()
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(HOLD.read)
    await dismissCookieBanner(page)
    if (act) await act(page)
    await page.waitForTimeout(HOLD.talk)
  } catch (error) {
    console.log(`  (evidence step on ${new URL(url).host} incomplete: ${(error as Error).message.split('\n')[0]})`)
  } finally {
    await page.close()
  }
}

// PolygonScan's banner: take the least-permissive choice that closes it.
async function dismissCookieBanner(page: Page): Promise<void> {
  for (const name of [/reject/i, /necessary only/i, /essential/i, /^ok$/i, /got it/i]) {
    const button = page.getByRole('button', { name }).first()
    if (await button.isVisible().catch(() => false)) {
      await button.click()
      return
    }
  }
}

export function liveEvidence(context: BrowserContext, opts: { supabaseRef: string | null; bucket: string }): Evidence {
  const dashboard = opts.supabaseRef ? `https://supabase.com/dashboard/project/${opts.supabaseRef}` : null
  return {
    supabaseStorage: async () => {
      if (!dashboard) return console.log('  (no SUPABASE_PROJECT_REF; skipped storage)')
      await show(context, `${dashboard}/storage/buckets/${opts.bucket}`, async (page) => {
        await page.getByText('pdfs', { exact: false }).first().click().catch(() => {})
        await page.waitForTimeout(HOLD.read)
      })
    },
    supabaseTable: async () => {
      if (!dashboard) return console.log('  (no SUPABASE_PROJECT_REF; skipped table)')
      await show(context, `${dashboard}/editor`, async (page) => {
        await page.getByRole('button', { name: 'documents', exact: true }).first().click()
        await page.waitForTimeout(HOLD.read)
        await page.mouse.wheel(600, 0)
      })
    },
    gmail: () => show(context, GMAIL_SEARCH),
    polygonTx: async (txUrl) => {
      if (txUrl) await show(context, txUrl)
      await show(context, `${AMOY.explorer}/address/${AMOY.contract}#readContract`, async (page) => {
        await page.getByText('verifyRoot', { exact: false }).first().click()
        await page.waitForTimeout(HOLD.beat)
        const input = page.locator('input[placeholder*="rootHash" i], input[name*="rootHash" i]').first()
        await input.click()
        await page.keyboard.press('Meta+V')
        await page.waitForTimeout(HOLD.beat)
        await page.getByRole('button', { name: 'Query' }).first().click()
        await page.waitForTimeout(HOLD.read)
      })
    },
    polygonEvents: () => show(context, `${AMOY.explorer}/address/${AMOY.contract}#events`),
  }
}
