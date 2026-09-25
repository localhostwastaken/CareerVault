import { expect, test, type Page } from '@playwright/test'
import { API_BASE } from '../env'
import { apiGet, apiPost, provisionOrganisation, signIn, type Organisation } from '../fixtures/api'
import { signExperienceLetter } from '../fixtures/documents'

// The whole document lifecycle in a browser, end to end: holder requests → manager signs →
// HR co-signs and issues → PDF → anchored → publicly verifiable → shared → revoked.
//
// This is the regression net for "the manager signs a draft and it never reaches HR". That
// failure was a server-side 500 from a missing signing key, so asserting the toast alone
// would not have caught it — each step asserts the state the NEXT actor depends on.

test.describe.configure({ mode: 'serial' })

let org: Organisation
let holderPage: Page
let managerPage: Page
let hrPage: Page
let documentId: string
let documentHash: string

// One context per role: the active persona lives in sessionStorage, so sharing a context
// between the manager and HR would have them overwriting each other's identity.
test.beforeAll(async ({ request, browser }) => {
  org = await provisionOrganisation(request, 'doc')
  holderPage = await signIn(browser, org.holder)
  managerPage = await signIn(browser, org.manager)
  hrPage = await signIn(browser, org.hr)
})

test.afterAll(async () => {
  await holderPage?.context().close()
  await managerPage?.context().close()
  await hrPage?.context().close()
})

test('a holder requests an experience letter', async () => {
  await holderPage.goto('/app/request')
  await expect(holderPage.getByRole('heading', { name: 'Request a document' })).toBeVisible()

  await holderPage.getByRole('combobox', { name: 'Organisation' }).selectOption({ label: org.name })
  // Naming the manager explicitly: auto-assignment picks "any available manager", which is
  // correct behaviour but would make the rest of this test depend on which one it chose.
  await holderPage.getByRole('combobox', { name: 'Manager' }).selectOption({ label: org.manager.fullName })
  await holderPage.getByLabel('Notes').fill('For a visa application.')

  await holderPage.getByRole('button', { name: 'Review & send' }).click()
  await holderPage.getByRole('button', { name: 'Send request' }).click()

  await expect(holderPage.getByRole('heading', { name: 'Request sent' })).toBeVisible()
  await holderPage.getByRole('link', { name: 'Track this request' }).click()
  await holderPage.waitForURL(/\/app\/documents\/[0-9a-f-]{36}/)
  documentId = holderPage.url().split('/').pop()!
})

test('the assigned manager sees it in their inbox', async () => {
  await managerPage.goto('/app/inbox')
  // If this is empty the request was routed to a different manager — and only the assigned
  // manager may sign, so nobody else could rescue it.
  await expect(managerPage.getByRole('link', { name: /Experience Letter/ }).first()).toBeVisible()
})

test('the manager signs the draft and it moves to HR', async () => {
  await managerPage.goto(`/app/documents/${documentId}`)
  // The action bar is permission-driven, so its presence is the assertion that this
  // manager is allowed to sign — an ORG_ADMIN or the wrong-org persona gets no button.
  const draftAndSign = managerPage.getByRole('link', { name: 'Draft & sign' })
  await expect(draftAndSign).toBeVisible()
  await draftAndSign.click()
  await managerPage.waitForURL(new RegExp(`/app/documents/${documentId}/sign`))
  // The drafting surface is a lazily-loaded route: wait for it explicitly rather than
  // letting the first field interaction absorb the chunk load into its own timeout.
  await expect(managerPage.getByRole('combobox', { name: 'Letter type' })).toBeVisible({
    timeout: 30_000,
  })

  await signExperienceLetter(managerPage, { employeeCode: 'EMP-0001' })

  // The completion panel is not the assertion. The status is.
  await expect(managerPage.getByRole('heading', { name: 'Signed and sent to HR' })).toBeVisible()
  await managerPage.getByRole('link', { name: 'View document' }).click()
  await managerPage.waitForURL(new RegExp(`/app/documents/${documentId}$`))
  await expect(managerPage.getByText('Pending HR').first()).toBeVisible()

  // And the handoff actually happened: it is in HR's queue, not merely "signed".
  await hrPage.goto('/app/approvals')
  await expect(hrPage.getByRole('link', { name: /Experience Letter/ }).first()).toBeVisible()
})

test('HR co-signs and the document is issued with a PDF', async () => {
  await hrPage.goto(`/app/documents/${documentId}`)
  await hrPage.getByRole('button', { name: 'Approve & issue' }).click()
  await hrPage.getByRole('dialog').getByRole('button', { name: 'Approve & issue' }).click()

  await expect(hrPage.getByText('Issued').first()).toBeVisible()

  // The client fetches the PDF with a bearer token and opens a blob URL, so there is no
  // download event to wait on — assert on the response instead.
  const download = hrPage.waitForResponse(
    (res) => res.url().includes(`/documents/${documentId}/download`) && res.status() === 200,
  )
  await hrPage.getByRole('button', { name: 'Download PDF' }).click()
  const response = await download
  expect(response.headers()['content-type']).toContain('application/pdf')
})

test('the issued document verifies publicly by hash', async ({ browser, request }) => {
  const doc = await apiGet<{ documentHash: string }>(
    request,
    `/documents/${documentId}`,
    org.hr.token,
  )
  documentHash = doc.documentHash
  expect(documentHash).toMatch(/^[0-9a-f]{64}$/)

  // A completely fresh, signed-out visitor — verification must need no account.
  const context = await browser.newContext()
  const visitor = await context.newPage()
  await visitor.goto(`/verify/hash/${documentHash}`)
  // Issued but not yet anchored is a PASS state, not a failure.
  await expect(visitor.getByText(/Verified/i).first()).toBeVisible()
  await context.close()
})

test('anchoring flips the document to ANCHORED', async ({ request }) => {
  // Merkle batching has no UI — it is an admin API call or the nightly cron.
  const result = await apiPost<{ anchored: number }>(
    request,
    '/merkle/run',
    {},
    org.admin.token,
  )
  expect(result.anchored).toBeGreaterThan(0)

  await holderPage.goto(`/app/documents/${documentId}`)
  await expect(holderPage.getByText('Anchored').first()).toBeVisible()
})

test('the holder shares the document and a stranger can verify the link', async ({ browser }) => {
  await holderPage.goto(`/app/documents/${documentId}`)
  await holderPage.getByRole('link', { name: 'Share' }).click()
  await holderPage.waitForURL(/\/app\/share-links/)

  await holderPage.getByRole('button', { name: 'Create link' }).first().click()
  const dialog = holderPage.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('combobox', { name: 'Document' }).selectOption(documentId)
  await dialog.getByRole('button', { name: 'Continue' }).click()

  // Share links are a paid feature for non-premium holders; the mock driver hands us a
  // local checkout rather than Stripe.
  await holderPage.waitForURL(/\/payments\/mock/)
  await holderPage.getByRole('button', { name: /^Pay/ }).click()
  await holderPage.waitForURL(/\/app\/share-links/)

  const shareUrl = await holderPage.getByText(/\/verify\/[0-9a-f]{48}/).first().innerText()
  const token = shareUrl.trim().split('/verify/').pop()!

  const context = await browser.newContext()
  const visitor = await context.newPage()
  await visitor.goto(`/verify/${token}`)
  await expect(visitor.getByText(/Verified/i).first()).toBeVisible()
  await context.close()
})

test('HR revokes it and public verification says so', async ({ browser }) => {
  await hrPage.goto(`/app/documents/${documentId}`)
  await hrPage.getByRole('button', { name: 'Revoke' }).click()
  const dialog = hrPage.getByRole('dialog')
  await dialog.getByRole('combobox', { name: 'Revocation reason' }).selectOption('ISSUED_IN_ERROR')
  await dialog.getByRole('button', { name: 'Revoke' }).click()

  await expect(hrPage.getByText('Revoked').first()).toBeVisible()

  const context = await browser.newContext()
  const visitor = await context.newPage()
  await visitor.goto(`/verify/hash/${documentHash}`)
  await expect(visitor.getByText(/Revoked/i).first()).toBeVisible()
  await context.close()
})

test('a relieving letter can be signed even though its extra field is collapsed', async ({
  request,
}) => {
  // `reasonForLeaving` becomes required the moment the letter certifies a separation, and it
  // sits inside the collapsed "Add more detail" section. Submitting used to fail validation
  // on a field nobody could see: no request, no error, a dead button. The helper asserts the
  // section opens; here we prove the signature actually goes through.
  const created = await apiPost<{ id: string }>(
    request,
    '/documents/request',
    {
      type: 'EXPERIENCE_LETTER',
      organizationId: org.id,
      managerUserId: org.manager.userId,
      notes: 'Leaving the company.',
    },
    org.holder.token,
  )

  await managerPage.goto(`/app/documents/${created.id}/sign`)
  await signExperienceLetter(managerPage, { letterKind: 'RELIEVING', employeeCode: 'EMP-0002' })

  await managerPage.getByRole('link', { name: 'View document' }).click()
  await managerPage.waitForURL(new RegExp(`/app/documents/${created.id}$`))
  await expect(managerPage.getByText('Pending HR').first()).toBeVisible()

  const doc = await apiGet<{ status: string }>(
    request,
    `/documents/${created.id}`,
    org.manager.token,
  )
  expect(doc.status).toBe('PENDING_HR')
  expect(API_BASE).toContain('9901') // guards against ever pointing this suite at dev
})
