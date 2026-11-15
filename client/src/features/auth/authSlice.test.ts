import { describe, expect, it } from 'vitest'
import authReducer, { logout, sessionRestoreFailed, setCredentials } from '@/features/auth/authSlice'

// After someone signs out on purpose, the next person to sign in on this tab must land on
// their own home, not on the page the previous person was looking at. A cold load that
// finds no session is different: there the deep link is the visitor's own and must survive.

const session = {
  token: 't',
  user: { id: 'alice', email: 'a@example.com', fullName: 'Alice', hasPassword: true, memberships: [] },
}
const initial = () => authReducer(undefined, { type: '@@init' })

describe('auth slice: who ended the session', () => {
  it('marks an explicit sign-out', () => {
    const state = authReducer(authReducer(initial(), setCredentials(session)), logout())
    expect(state.endedByUser).toBe(true)
  })

  it('does not mark a cold load that found no session', () => {
    expect(authReducer(initial(), sessionRestoreFailed()).endedByUser).toBe(false)
  })

  it('clears the mark on the next sign-in', () => {
    const signedOut = authReducer(authReducer(initial(), setCredentials(session)), logout())
    expect(authReducer(signedOut, setCredentials(session)).endedByUser).toBe(false)
  })
})
