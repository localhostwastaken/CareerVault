import { describe, expect, it } from 'vitest'
import { createAppStore } from '@/store'
import { logout, setActivePersona, setCredentials } from '@/features/auth/authSlice'
import { notificationApi } from '@/features/notification/api'
import type { AuthResponse } from '@/features/auth/types'

// Audit F04: one browser tab signs in as several people during the demo. Whatever the
// previous identity loaded must be gone before the next one's screens render.

const session = (id: string, token = 'token-1'): AuthResponse => ({
  token,
  user: { id, email: `${id}@example.com`, fullName: id, hasPassword: true, memberships: [] },
})

function storeWithCachedCount(userId: string) {
  const store = createAppStore()
  store.dispatch(setCredentials(session(userId)))
  store.dispatch(notificationApi.util.upsertQueryData('unreadCount', undefined, { count: 7 }))
  return store
}

const cachedQueries = (store: ReturnType<typeof createAppStore>) => Object.keys(store.getState().api.queries)

describe('session cache reset', () => {
  it('drops cached queries on logout', async () => {
    const store = storeWithCachedCount('alice')
    expect(cachedQueries(store)).toHaveLength(1)

    store.dispatch(logout())
    await Promise.resolve()

    expect(cachedQueries(store)).toHaveLength(0)
  })

  it('drops cached queries when a different user signs in', async () => {
    const store = storeWithCachedCount('alice')

    store.dispatch(setCredentials(session('marcus')))
    await Promise.resolve()

    expect(cachedQueries(store)).toHaveLength(0)
  })

  it('drops cached queries when the persona changes', async () => {
    const store = storeWithCachedCount('marcus')

    store.dispatch(setActivePersona({ role: 'MANAGER', organizationId: 'org-1' }))
    await Promise.resolve()

    expect(cachedQueries(store)).toHaveLength(0)
  })

  it('keeps cached queries when the same user refreshes their token', async () => {
    const store = storeWithCachedCount('alice')

    store.dispatch(setCredentials(session('alice', 'token-2')))
    await Promise.resolve()

    expect(cachedQueries(store)).toHaveLength(1)
  })
})
