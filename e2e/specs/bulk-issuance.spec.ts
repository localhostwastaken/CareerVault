import { expect, test } from '@playwright/test'
import { apiGet, provisionOrganisation, signIn, slug, type Organisation } from '../fixtures/api'

// The second way people get documents: HR uploads a CSV and the batch is issued straight to
// ISSUED, skipping the manager step (HR is both signer and approver, with two distinct
// role-bound signatures). It also auto-provisions holder accounts for addresses it has never
// seen, which is the only path that creates employees in bulk.

test.describe.configure({ mode: 'serial' })

let org: Organisation

test.beforeAll(async ({ request }) => {
  org = await provisionOrganisation(request, 'bulk')
})

test('HR issues a batch of experience letters from a CSV', async ({ browser, request }) => {
  const id = slug()
  const employees = [`bulk-a-${id}@e2e-mail.test`, `bulk-b-${id}@e2e-mail.test`]
  const csv = [
    'employee_email,full_name,designation,department,start_date,end_date',
    `${employees[0]},Bulk One,Software Engineer,Engineering,2021-04-01,2026-03-31`,
    `${employees[1]},Bulk Two,Data Analyst,Analytics,2022-01-10,2026-02-28`,
  ].join('\n')

  const hr = await signIn(browser, org.hr)
  await hr.goto('/app/bulk')
  await expect(hr.getByRole('heading', { name: 'Bulk issue' })).toBeVisible()

  await hr.getByRole('combobox', { name: 'Document type' }).selectOption('EXPERIENCE_LETTER')
  await hr.getByLabel('Employee CSV').setInputFiles({
    name: 'employees.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  })
  await hr.getByRole('button', { name: 'Issue batch' }).click()

  // Upload answers 202 and processes in the background, so poll the batch rather than
  // racing the UI.
  await expect
    .poll(
      async () => {
        const batches = await apiGet<Array<{ id: string; status: string; errorRows: number }>>(
          request,
          `/bulk-issuance?organizationId=${org.id}`,
          org.hr.token,
        )
        return batches[0]?.status
      },
      { timeout: 60_000, message: 'batch never finished processing' },
    )
    .toBe('COMPLETED')

  const batches = await apiGet<
    Array<{ id: string; errorRows: number; processedRows: number; totalRows: number }>
  >(request, `/bulk-issuance?organizationId=${org.id}`, org.hr.token)
  expect(batches[0].errorRows).toBe(0)
  expect(batches[0].totalRows).toBe(employees.length)
  expect(batches[0].processedRows).toBe(employees.length)

  // The queue lists people by name, not address — these two holders did not exist before
  // the upload, so seeing them here proves the accounts were provisioned as well as issued.
  await hr.goto('/app/issued')
  for (const name of ['Bulk One', 'Bulk Two']) {
    await expect(hr.getByText(`For ${name}`)).toBeVisible()
  }

  await hr.context().close()
})

test('salary proofs are refused for bulk issuance', async ({ request }) => {
  // The dropdown offers SALARY_PROOF but the server rejects it outright. Asserting the
  // refusal keeps the two from silently diverging.
  const response = await request.post(
    `${(await import('../env')).API_BASE}/bulk-issuance`,
    {
      headers: { Authorization: `Bearer ${org.hr.token}` },
      multipart: {
        organizationId: org.id,
        documentType: 'SALARY_PROOF',
        file: {
          name: 'employees.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(
            'employee_email,full_name,designation,department,start_date,salary\na@b.test,A B,Dev,Eng,2021-01-01,100000',
            'utf8',
          ),
        },
      },
    },
  )
  expect(response.status()).toBe(422)
})
