import { expect, test } from '@playwright/test'
import { API_BASE } from '../env'
import { apiPost, provisionOrganisation, signIn, type Organisation } from '../fixtures/api'
import { CONDUCT_SUMMARY } from '../fixtures/documents'

// Separation of duties is the product's core claim: a document is only worth anything
// because two different people, in two specific roles, signed it. These are the boundaries
// that make that true, checked at the API (which is authoritative) and in the UI (which must
// not offer a button the API will refuse).

test.describe.configure({ mode: 'serial' })

let org: Organisation
let documentId: string

const signPayload = {
  contentJson: {
    letterKind: 'EXPERIENCE',
    employeeName: 'Eve Employee',
    employeeCode: 'EMP-RBAC',
    designation: 'Software Engineer',
    employmentType: 'FULL_TIME',
    dateOfJoining: '2022-06-01',
    conductSummary: CONDUCT_SUMMARY,
    signatoryName: 'stamped by the server',
    signatoryDesignation: 'Head of Engineering',
  },
}

async function rawPost(
  request: import('@playwright/test').APIRequestContext,
  path: string,
  data: unknown,
  token: string,
) {
  return request.post(`${API_BASE}${path}`, {
    data,
    headers: { Authorization: `Bearer ${token}` },
  })
}

test.beforeAll(async ({ request }) => {
  org = await provisionOrganisation(request, 'rbac')
  const doc = await apiPost<{ id: string }>(
    request,
    '/documents/request',
    {
      type: 'EXPERIENCE_LETTER',
      organizationId: org.id,
      managerUserId: org.manager.userId,
    },
    org.holder.token,
  )
  documentId = doc.id
})

test('an org admin cannot sign — administering is not vouching', async ({ request, browser }) => {
  const response = await rawPost(request, `/documents/${documentId}/sign`, signPayload, org.admin.token)
  expect(response.status()).toBe(403)

  // And the UI must not dangle the action in front of them.
  const admin = await signIn(browser, org.admin)
  await admin.goto(`/app/documents/${documentId}`)
  await expect(admin.getByRole('link', { name: 'Draft & sign' })).toHaveCount(0)
  await admin.context().close()
})

test('a holder cannot sign their own document', async ({ request }) => {
  const response = await rawPost(request, `/documents/${documentId}/sign`, signPayload, org.holder.token)
  expect(response.status()).toBe(403)
})

test('an HR member cannot stand in for the manager', async ({ request }) => {
  const response = await rawPost(request, `/documents/${documentId}/sign`, signPayload, org.hr.token)
  expect(response.status()).toBe(403)
})

test('the manager who signed cannot also approve', async ({ request }) => {
  await apiPost(request, `/documents/${documentId}/sign`, signPayload, org.manager.token)

  // Give the manager the HR role too, so the only thing standing between them and a
  // single-handed issuance is the separation-of-duties check itself.
  await apiPost(
    request,
    `/orgs/${org.id}/members`,
    { email: org.manager.email, role: 'HR' },
    org.admin.token,
  )

  const response = await rawPost(request, `/documents/${documentId}/approve`, {}, org.manager.token)
  expect(response.status()).toBe(409)
  expect(await response.text()).toContain('cannot also approve')

  // The genuine second person still can.
  const approved = await apiPost<{ status: string }>(
    request,
    `/documents/${documentId}/approve`,
    {},
    org.hr.token,
  )
  expect(approved.status).toBe('ISSUED')
})

test("a manager at another organisation cannot open this document", async ({ request, browser }) => {
  const other = await provisionOrganisation(request, 'rival')

  const response = await request.get(`${API_BASE}/documents/${documentId}`, {
    headers: { Authorization: `Bearer ${other.manager.token}` },
  })
  expect(response.status()).toBe(403)

  const rival = await signIn(browser, other.manager)
  await rival.goto(`/app/documents/${documentId}`)
  await expect(rival.getByText("Couldn't load this document")).toBeVisible()
  await rival.context().close()
})

test('a holder-only route is closed to an issuer persona', async ({ browser }) => {
  // HR rather than the manager: the previous test granted the manager an HR role too, which
  // changes which home their persona resolves to. Depending on that would make this test
  // read as if it were about routing when it was really about test ordering.
  const hr = await signIn(browser, org.hr)
  // RoleGate sends the wrong persona to its own home rather than rendering the screen.
  await hr.goto('/app/wallet')
  await hr.waitForURL(/\/app\/approvals/)
  await expect(hr.getByRole('heading', { name: 'Approvals' })).toBeVisible()
  await hr.context().close()
})
