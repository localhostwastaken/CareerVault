import type { BrowserContext, Locator, Page } from 'playwright'
import { ACCOUNTS, HOLD, STEP_UP, TYPE_DELAY_MS } from './config.js'
import { setActor } from './overlay.js'

export type AccountKey = keyof typeof ACCOUNTS

export const hold = (page: Page, ms: number) => page.waitForTimeout(ms)

// Human-speed typing so the room can read what goes in.
export async function typeInto(field: Locator, text: string): Promise<void> {
  await field.click()
  await field.fill('')
  await field.pressSequentially(text, { delay: TYPE_DELAY_MS })
}

export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {})
}

export async function signIn(page: Page, context: BrowserContext, who: AccountKey, password: string): Promise<void> {
  const account = ACCOUNTS[who]
  await page.goto('/auth/login')
  await setActor(context, `${account.role} · ${account.name}`)
  await typeInto(page.getByLabel('Email'), account.email)
  // The password is typed fast and is masked on screen; it never appears in logs.
  await page.getByLabel('Password').fill(password)
  await hold(page, HOLD.beat)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/app\//)
  await settle(page)
  await hold(page, HOLD.read)
}

export async function signOut(page: Page, context: BrowserContext, who: AccountKey): Promise<void> {
  await page.getByRole('button', { name: new RegExp(ACCOUNTS[who].name) }).click()
  await hold(page, HOLD.beat)
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.waitForURL(/\/auth\/login/)
  await setActor(context, null)
}

// Fills the step-up dialog. The answers follow the enrolment order (school, city, pet).
export async function stepUp(page: Page, opts: { wrong?: boolean } = {}): Promise<void> {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Date of birth').fill(STEP_UP.dateOfBirth)
  await typeInto(dialog.getByLabel('Personal ID'), STEP_UP.personalId)
  const answers = dialog.getByPlaceholder('Your answer')
  for (let i = 0; i < 3; i++) {
    const answer = opts.wrong && i === 1 ? STEP_UP.wrongAnswer : STEP_UP.answers[i]
    await typeInto(answers.nth(i), answer)
  }
  await hold(page, HOLD.beat)
}

export async function scrollThrough(page: Page, steps: number, pauseMs: number): Promise<void> {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 420)
    await hold(page, pauseMs)
  }
}
