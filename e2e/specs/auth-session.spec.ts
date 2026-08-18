import { expect, test, type Page } from '@playwright/test'
import { PASSWORD, provisionOrganisation, signIn, type Organisation } from '../fixtures/api'

// Regression net for: "reloading a signed-in page shows the sign-in screen for a moment,
// then redirects to the right place."
//
// The access token is memory-only, so a reload has to ask /auth/refresh before it knows
// whether anyone is signed in. The guard used to read "no token" as "signed out" and
// navigate to /auth/login, and a effect on the login page bounced the user back once the
// refresh landed. Both halves of that round trip are what these tests forbid.
//
// Assertions are made on the NAVIGATION HISTORY rather than by looking for the login form,
// because the flash is a race: polling for the absence of something that appears for 200ms
// is itself racy and would pass on a fast machine while the bug was still there.

test.describe.configure({ mode: 'serial' })

/** Records every URL the page commits to, including ones it leaves again immediately. */
function trackNavigations(page: Page): string[] {
  const seen: string[] = []
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) seen.push(frame.url())
  })
  return seen
}

function expectNeverVisitedLogin(seen: string[], context: string): void {
  const offenders = seen.filter((url) => url.includes('/auth/login'))
  expect(offenders, `${context} — navigated to the sign-in screen: ${offenders.join(', ')}`).toEqual([])
}

let org: Organisation

test.beforeAll(async ({ request }) => {
  org = await provisionOrganisation(request, 'auth')
})

test('a reload on a role home never passes through the sign-in screen', async ({ browser }) => {
  for (const [role, account, home, heading] of [
    ['manager', () => org.manager, '/app/inbox', 'Inbox'],
    ['hr', () => org.hr, '/app/approvals', 'Approvals'],
    ['admin', () => org.admin, '/app/org', /Organi[sz]ation/],
    ['holder', () => org.holder, '/app/wallet', 'Your documents at a glance'],
  ] as const) {
    const page = await signIn(browser, account())
    await page.goto(home)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()

    const seen = trackNavigations(page)
    await page.reload()

    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    expect(page.url()).toContain(home)
    expectNeverVisitedLogin(seen, `${role} reloading ${home}`)

    await page.context().close()
  }
})

test('a reload on a deep link keeps the query string and never shows sign-in', async ({ browser }) => {
  const page = await signIn(browser, org.holder)
  const deepLink = '/app/documents?status=progress'
  await page.goto(deepLink)
  await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible()

  const seen = trackNavigations(page)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible()
  // The filter is part of where the user was; losing it on reload is the same class of bug.
  expect(new URL(page.url()).search).toBe('?status=progress')
  expectNeverVisitedLogin(seen, 'holder reloading a filtered list')

  await page.context().close()
})

test('opening the sign-in URL while signed in never paints the form', async ({ browser }) => {
  const page = await signIn(browser, org.manager)

  // The form itself must never appear — this page is allowed to be *visited*, it just has
  // to resolve the session before deciding what to render.
  await page.goto('/auth/login')
  await page.waitForURL(/\/app(\/|$)/)
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0)

  await page.context().close()
})

test('a signed-out visitor is sent to sign-in and returned to the page they wanted', async ({
  browser,
}) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('/app/documents?status=progress')
  await page.waitForURL(/\/auth\/login/)
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

  await page.getByLabel('Email').fill(org.holder.email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // The whole point of recording `from`: the deep link survives the detour.
  await page.waitForURL(/\/app\/documents\?status=progress/)
  await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible()

  await context.close()
})

test('the public landing page renders without waiting on a session', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  // Gating the whole router on the session restore would have made every public page pay a
  // network round trip. Only /app/* is allowed to wait.
  await page.goto('/')
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 5_000 })

  await context.close()
})
