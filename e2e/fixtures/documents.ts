import { expect, type Page } from '@playwright/test'

/** A conduct summary long enough for the 20-character server minimum. */
export const CONDUCT_SUMMARY =
  'Led the payments squad, shipped the settlement rewrite, and conducted themselves professionally throughout.'

/**
 * Fill and submit the manager's drafting form for an experience letter.
 *
 * `letterKind` matters: anything other than EXPERIENCE certifies a separation, which makes
 * `Last working day` appear AND makes `Reason for leaving` required — and that field lives
 * inside the collapsed "Add more detail" section. That combination is what used to make the
 * submit button do nothing at all, so the relieving path is deliberately exercised.
 */
export async function signExperienceLetter(
  page: Page,
  options: { letterKind?: 'EXPERIENCE' | 'RELIEVING'; employeeCode?: string } = {},
): Promise<void> {
  const letterKind = options.letterKind ?? 'EXPERIENCE'

  await page.getByRole('combobox', { name: 'Letter type' }).selectOption(letterKind)
  await page.getByLabel('Employee code').fill(options.employeeCode ?? 'EMP-0001')
  // `exact` matters: 'Signatory designation' also contains 'Designation'.
  await page.getByLabel('Designation', { exact: true }).fill('Software Engineer')
  await page.getByLabel('Date of joining').fill('2022-06-01')
  await page.getByLabel('Conduct summary').fill(CONDUCT_SUMMARY)

  if (letterKind !== 'EXPERIENCE') {
    await page.getByLabel('Last working day').fill('2026-01-31')
  }

  await page.getByRole('button', { name: 'Sign & send to HR' }).click()

  if (letterKind !== 'EXPERIENCE') {
    // Regression guard: the form must SHOW the blocking requirement rather than silently
    // refusing to submit. Before the fix this section stayed shut and nothing happened.
    const reason = page.getByRole('combobox', { name: 'Reason for leaving' })
    await expect(reason).toBeVisible()
    await reason.selectOption('RESIGNATION')
    await page.getByRole('button', { name: 'Sign & send to HR' }).click()
  }
}
