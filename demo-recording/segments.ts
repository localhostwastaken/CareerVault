// The take, in the order of spec §6.5. App steps are strict: a missing element throws and
// the take stops. External evidence (PolygonScan, Supabase, Gmail) goes through `evidence`,
// which a local rehearsal skips.
import type { BrowserContext, Page } from 'playwright'
import { awaitVerdict, hold, scrollThrough, settle, signIn, signOut, stepUp, typeInto, type AccountKey } from './actions.js'
import { HOLD } from './config.js'
import type { Evidence } from './evidence.js'

export interface TakeContext {
  page: Page
  context: BrowserContext
  password: string
  evidence: Evidence
  outDir: string
  /** The take's own document, discovered in segment 3. */
  documentId?: string
}

const as = (t: TakeContext, who: AccountKey) => signIn(t.page, t.context, who, t.password)
const out = (t: TakeContext, who: AccountKey) => signOut(t.page, t.context, who)

export async function landing(t: TakeContext) {
  await t.page.goto('/')
  await settle(t.page)
  await hold(t.page, HOLD.talk)
  await scrollThrough(t.page, 6, HOLD.read)
  await t.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await hold(t.page, HOLD.read)
}

export async function holderRequests(t: TakeContext) {
  const { page } = t
  await as(t, 'alice')
  await page.getByRole('link', { name: 'Request document' }).first().click()
  await settle(page)
  await page.getByLabel('Organisation').selectOption({ label: 'TechCorp' })
  await hold(page, HOLD.beat)
  await page.getByLabel('Manager').selectOption({ label: 'Marcus Manager' }).catch(() => {})
  await typeInto(page.getByLabel('Notes'), 'Experience letter for my next role, please.')
  await page.getByLabel('Enable AI skill extraction').check()
  await hold(page, HOLD.read)
  await page.getByRole('button', { name: 'Review & send' }).click()
  await hold(page, HOLD.talk)
  await page.getByRole('dialog').getByRole('button', { name: 'Send request' }).click()
  await settle(page)
  await hold(page, HOLD.talk)
  await out(t, 'alice')
}

export async function managerSigns(t: TakeContext) {
  const { page } = t
  await as(t, 'marcus')
  await page.getByRole('link', { name: /Draft & sign: .*Alice Holder/ }).click()
  await page.waitForURL(/\/sign$/)
  await settle(page)
  t.documentId = page.url().match(/documents\/([0-9a-f-]{36})/)?.[1]
  await typeInto(page.getByRole('textbox', { name: 'Employee code', exact: true }), 'TC-2041')
  await typeInto(page.getByRole('textbox', { name: 'Designation', exact: true }), 'Software Engineer')
  await page.getByRole('textbox', { name: 'Date of joining', exact: true }).fill('2022-06-01')
  await typeInto(
    page.getByRole('textbox', { name: 'Conduct summary', exact: true }),
    'Alice built our payment settlement service in Node.js and TypeScript on PostgreSQL and conducted herself professionally throughout.',
  )
  await hold(page, HOLD.read)
  await page.getByRole('button', { name: 'Sign & send to HR' }).click()
  await page.getByRole('dialog').waitFor()
  await hold(page, HOLD.talk)
  await stepUp(page, { wrong: true })
  await page.getByRole('dialog').getByRole('button', { name: /sign/i }).last().click()
  // The refusal arrives as a toast; hold while the room reads it.
  await page.locator('[data-sonner-toast]').first().waitFor()
  await hold(page, HOLD.talk)
  await stepUp(page)
  await page.getByRole('dialog').getByRole('button', { name: /sign/i }).last().click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await settle(page)
  await hold(page, HOLD.talk)
  await out(t, 'marcus')
}

export async function hrIssues(t: TakeContext) {
  const { page } = t
  await as(t, 'hannah')
  await page.getByRole('link', { name: /Review.*Alice Holder/ }).click()
  await settle(page)
  await hold(page, HOLD.talk)
  await page.getByRole('button', { name: 'Approve & issue' }).click()
  await page.getByRole('dialog').waitFor()
  await stepUp(page)
  await page.getByRole('dialog').getByRole('button', { name: 'Approve & issue' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await settle(page)
  await hold(page, HOLD.talk)
  await t.evidence.supabaseStorage()
  await t.evidence.supabaseTable()
  await out(t, 'hannah')
}

export async function holderSharesAndVerifies(t: TakeContext) {
  const { page, context } = t
  await as(t, 'alice')
  await t.evidence.gmail()
  await page.goto(`/app/documents/${t.documentId}`)
  await settle(page)
  await hold(page, HOLD.talk)
  // The app opens the decrypted PDF in a new tab.
  const [pdf] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Download PDF' }).click()])
  await pdf.waitForLoadState().catch(() => {})
  await hold(pdf, HOLD.talk)
  await scrollThrough(pdf, 2, HOLD.read)
  await pdf.close()
  await page.getByRole('link', { name: 'Share', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Continue' }).click()
  await hold(page, HOLD.talk)
  const [shared] = await Promise.all([context.waitForEvent('page'), page.getByRole('link', { name: "Preview what they'll see" }).click()])
  await settle(shared)
  await awaitVerdict(shared)
  await hold(shared, HOLD.talk)
  await scrollThrough(shared, 3, HOLD.read)
  await shared.close()
  await page.goto(`/verify/${t.documentId}`)
  await settle(page)
  await awaitVerdict(page)
  await hold(page, HOLD.talk)
  await page.goto('/app/wallet')
  await settle(page)
  await out(t, 'alice')
}

export async function adminAnchors(t: TakeContext) {
  const { page } = t
  await as(t, 'olivia')
  await page.getByRole('link', { name: 'Analytics' }).click()
  await settle(page)
  await hold(page, HOLD.read)
  await page.getByRole('button', { name: 'Anchor now' }).click()
  const txLink = page.getByRole('link', { name: 'Open the transaction on PolygonScan' })
  await page.getByText(/anchored|batch/i).first().waitFor({ timeout: 180_000 })
  await hold(page, HOLD.talk)
  const txUrl = await txLink.getAttribute('href').catch(() => null)
  // The document's on-chain card carries the full root; copy it to paste into PolygonScan.
  await page.goto(`/app/documents/${t.documentId}`)
  await settle(page)
  await page.getByText('On-chain proof').scrollIntoViewIfNeeded()
  await hold(page, HOLD.read)
  await page.getByRole('button', { name: 'Copy Merkle root' }).click()
  await t.evidence.polygonTx(txUrl)
  await out(t, 'olivia')
  // Re-verify publicly: same verdict, now with the on-chain badge, and the root on PolygonScan.
  await page.goto(`/verify/${t.documentId}`)
  await settle(page)
  await awaitVerdict(page)
  await hold(page, HOLD.talk)
}

export async function hrRevokes(t: TakeContext) {
  const { page } = t
  await as(t, 'hannah')
  await page.getByRole('link', { name: 'Issued' }).click()
  await settle(page)
  await page.getByRole('link', { name: 'Experience Letter — For Bob Holder' }).click()
  await settle(page)
  const bobDocument = page.url().match(/documents\/([0-9a-f-]{36})/)?.[1]
  await page.getByRole('button', { name: 'Revoke' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Revocation reason').selectOption({ index: 1 })
  await typeInto(dialog.getByLabel('Note for the holder'), 'Issued with the wrong last working day.')
  await hold(page, HOLD.beat)
  await page.getByRole('dialog').getByRole('button', { name: 'Revoke' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  await hold(page, HOLD.read)
  await page.goto(`/verify/${bobDocument}`)
  await settle(page)
  await awaitVerdict(page)
  await hold(page, HOLD.talk)
  await t.evidence.polygonEvents()
  await page.goto('/app/issued')
  await out(t, 'hannah')
}

export async function adminOversight(t: TakeContext) {
  const { page } = t
  await as(t, 'olivia')
  await page.getByRole('link', { name: 'Members' }).click()
  await settle(page)
  await hold(page, HOLD.talk)
  await page.getByRole('link', { name: 'Audit Log' }).click()
  await settle(page)
  await hold(page, HOLD.talk)
  await out(t, 'olivia')
}

export async function builtOnTop(t: TakeContext) {
  const { page } = t
  await as(t, 'riya')
  await page.getByRole('button', { name: 'Find candidates' }).first().click()
  await page.getByText('Alice Holder').first().waitFor({ timeout: 120_000 })
  await hold(page, HOLD.talk)
  await page.getByText('Alice Holder').first().scrollIntoViewIfNeeded()
  await hold(page, HOLD.talk)
  await out(t, 'riya')
  await as(t, 'alice')
  await page.getByRole('link', { name: 'Talent Profile' }).click()
  await settle(page)
  await hold(page, HOLD.talk)
  await out(t, 'alice')
  await page.goto('/')
  await hold(page, HOLD.talk)
}

export const SEGMENTS = [
  landing,
  holderRequests,
  managerSigns,
  hrIssues,
  holderSharesAndVerifies,
  adminAnchors,
  hrRevokes,
  adminOversight,
  builtOnTop,
]
