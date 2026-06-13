import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '@/store'
import { primaryRole } from '@/lib/roles'

export const useAppDispatch = () => useDispatch<AppDispatch>()

export function useAuth() {
  const auth = useSelector((state: RootState) => state.auth)
  return {
    ...auth,
    isAuthenticated: Boolean(auth.token),
    role: primaryRole(auth.user),
  }
}
