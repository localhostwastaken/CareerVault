import { expect, test, type Browser, type Page } from '@playwright/test'
import { PASSWORD, slug } from '../fixtures/api'

// The set-up journey, driven entirely through the UI: found an organisation, verify its
// domain, staff it, and let an employee join. Everything downstream depends on this working,
// and each step has a precondition that is easy to break silently — so each is asserted.

test.describe.configure({ mode: 'serial' })

const ID = slug()
const DOMAIN = `e2e-ui-${ID}.test`
const ORG_NAME = `E2E UI Acme ${ID}`
const ADMIN_EMAIL = `admin@${DOMAIN}`
const MANAGER_EMAIL = `mgr-ui-${ID}@e2e-mail.test`
const HR_EMAIL = `hr-ui-${ID}@e2e-mail.test`
const RECRUITER_EMAIL = `rec-ui-${ID}@e2e-mail.test`
const HOLDER_EMAIL = `emp-ui-${ID}@e2e-mail.test`

// The per-test `page` fixture gets a fresh context, which would drop the founder's session
// between steps. The journey is one continuous session, so the admin keeps one page.
let admin: Page

async function registerThrough(
  page: Page,
  email: string,
  fullName: string,
  accountType: 'Employee' | 'Organisation',
): Promise<void> {
  await page.goto('/auth/register')
  // The account-type radios are visually hidden behind card labels, so click the card.
  await page.getByText(accountType, { exact: true }).click()
  await page.getByLabel('Full name').fill(fullName)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL(/\/app(\/|$)/)
}

async function registerInOwnContext(
  browser: Browser,
  email: string,
  fullName: string,
): Promise<void> {
  const context = await browser.newContext()
  await registerThrough(await context.newPage(), email, fullName, 'Employee')
  await context.close()
}

test.beforeAll(async ({ browser }) => {
  admin = await (await browser.newContext()).newPage()
})

test.afterAll(async () => {
  await admin?.context().close()
})

test('an organisation is founded and its domain verified', async () => {
  await registerThrough(admin, ADMIN_EMAIL, 'Ava Admin', 'Organisation')

  // An ORG_ADMIN registrant with no org yet must land on the org screen, not the wallet.
  await admin.waitForURL(/\/app\/org/)
  await expect(admin.getByRole('heading', { name: 'Set up your organization' })).toBeVisible()

  await admin.getByLabel('Organization name').fill(ORG_NAME)
  await admin.getByLabel('Domain').fill(DOMAIN)
  await admin.getByRole('button', { name: 'Create organization' }).click()

  // Until the domain is verified the org holds no signing key and can issue nothing.
  const verify = admin.getByRole('button', { name: 'Verify domain' })
  await expect(verify).toBeVisible()
  await expect(admin.getByText('Unverified')).toBeVisible()

  await verify.click()
  // "Verified" alone is ambiguous — it is both the status badge and a row label in the
  // details list below. The prompt disappearing is the unambiguous signal.
  await expect(admin.getByText('Domain verified — you can now issue documents.')).toBeVisible()
  await expect(verify).toBeHidden()
})

test('staff are added by email, one row per role', async ({ browser }) => {
  // These three must already have passwords: member-add emails a magic link to anyone who
  // does not, and a test can never read that email.
  await registerInOwnContext(browser, MANAGER_EMAIL, 'Marcus Manager')
  await registerInOwnContext(browser, HR_EMAIL, 'Hana Hr')
  await registerInOwnContext(browser, RECRUITER_EMAIL, 'Rhea Recruiter')

  await admin.goto('/app/members')
  await expect(admin.getByRole('heading', { name: 'Members', exact: true })).toBeVisible()

  for (const [email, role] of [
    [MANAGER_EMAIL, 'MANAGER'],
    [HR_EMAIL, 'HR'],
    [RECRUITER_EMAIL, 'RECRUITER'],
  ] as const) {
    await admin.getByRole('button', { name: 'Add member' }).first().click()
    const dialog = admin.getByRole('dialog')
    await dialog.getByLabel('Email').fill(email)
    await dialog.getByRole('combobox', { name: 'Role' }).selectOption(role)
    await dialog.getByRole('button', { name: 'Add member' }).click()
    await expect(dialog).toBeHidden()
    await expect(admin.getByText(email)).toBeVisible()
  }
})

test('an employee signs themselves up and can reach the request form', async ({ page }) => {
  // Holders are never "added" to an org — there is no holder membership. They register
  // themselves and choose a verified organisation when they request a document.
  await registerThrough(page, HOLDER_EMAIL, 'Eve Employee', 'Employee')
  await page.waitForURL(/\/app\/wallet/)

  await page.getByRole('link', { name: 'Request document' }).first().click()
  await page.waitForURL(/\/app\/request/)

  // The org appears in this list only because it was verified in the first test.
  await expect(page.getByRole('combobox', { name: 'Organisation' })).toContainText(ORG_NAME)
})
