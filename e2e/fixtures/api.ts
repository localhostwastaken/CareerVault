import { expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import { API_BASE } from '../env'

export const PASSWORD = 'Password123@'

/** Unique per run so re-runs never collide on the unique email / org-domain constraints. */
export function slug(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`
}

export interface Account {
  email: string
  fullName: string
  token: string
  userId: string
}

export interface Organisation {
  id: string
  name: string
  domain: string
  admin: Account
  manager: Account
  hr: Account
  holder: Account
}

function unwrap<T>(body: unknown): T {
  const envelope = body as { success?: boolean; data?: T; error?: { message?: string } }
  if (!envelope?.success) {
    throw new Error(`API call failed: ${envelope?.error?.message ?? JSON.stringify(body)}`)
  }
  return envelope.data as T
}

export async function apiPost<T>(
  request: APIRequestContext,
  path: string,
  data: unknown,
  token?: string,
): Promise<T> {
  const response = await request.post(`${API_BASE}${path}`, {
    data,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  expect(response.ok(), `POST ${path} → ${response.status()}: ${await response.text()}`).toBe(true)
  return unwrap<T>(await response.json())
}

export async function apiGet<T>(
  request: APIRequestContext,
  path: string,
  token?: string,
): Promise<T> {
  const response = await request.get(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  expect(response.ok(), `GET ${path} → ${response.status()}: ${await response.text()}`).toBe(true)
  return unwrap<T>(await response.json())
}

export async function registerAccount(
  request: APIRequestContext,
  email: string,
  fullName: string,
): Promise<Account> {
  const data = await apiPost<{ token: string; user: { id: string } }>(
    request,
    '/auth/register',
    { email, password: PASSWORD, fullName, accountType: 'HOLDER' },
  )
  return { email, fullName, token: data.token, userId: data.user.id }
}

/**
 * Build a verified organisation with one member per role, through the API.
 *
 * The UI paths for all of this are covered by org-and-members.spec.ts; specs about the
 * document lifecycle use this so they spend their time on the behaviour they are actually
 * about. Two ordering rules are load-bearing and are the reason this helper exists:
 *
 *  1. The founder's email host MUST equal the org domain (anti-squatting check in
 *     OrganizationService.create).
 *  2. Manager and HR must already have passwords BEFORE being added as members — otherwise
 *     member-add treats them as invitees and emails a magic link they can never receive
 *     from a test.
 */
export async function provisionOrganisation(
  request: APIRequestContext,
  label = 'acme',
): Promise<Organisation> {
  const id = slug()
  const domain = `e2e-${label}-${id}.test`

  const admin = await registerAccount(request, `admin@${domain}`, 'Ava Admin')
  const manager = await registerAccount(request, `mgr-${id}@e2e-mail.test`, 'Marcus Manager')
  const hr = await registerAccount(request, `hr-${id}@e2e-mail.test`, 'Hana Hr')
  const holder = await registerAccount(request, `emp-${id}@e2e-mail.test`, 'Eve Employee')

  const name = `E2E ${label} ${id}`
  const org = await apiPost<{ id: string }>(request, '/orgs', { name, domain }, admin.token)

  // Mints the org signing key. DNS_DRIVER=local means the TXT check always passes.
  await apiPost(request, `/orgs/${org.id}/verify-domain`, {}, admin.token)

  await apiPost(request, `/orgs/${org.id}/members`, { email: manager.email, role: 'MANAGER' }, admin.token)
  await apiPost(request, `/orgs/${org.id}/members`, { email: hr.email, role: 'HR' }, admin.token)

  return { id: org.id, name, domain, admin, manager, hr, holder }
}

/**
 * A browser signed in as one account.
 *
 * Each role needs its OWN context: the active persona lives in sessionStorage, so sharing
 * one context between an HR and a manager would have them fighting over it.
 */
export async function signIn(browser: Browser, account: Account): Promise<Page> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/auth/login')
  await page.getByLabel('Email').fill(account.email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/app(\/|$)/)
  return page
}
