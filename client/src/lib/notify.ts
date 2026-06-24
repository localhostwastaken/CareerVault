import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { toast } from 'sonner'

// The themed alert/toast surface. Always route user-facing success/error feedback
// through here so visuals stay consistent.
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message),
}

/** Pull the human message out of our standard API error envelope. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as FetchBaseQueryError).data
    if (data && typeof data === 'object' && 'error' in data) {
      const inner = (data as { error?: { message?: string } }).error
      if (inner?.message) return inner.message
    }
  }
  return fallback
}

export function toastApiError(error: unknown, fallback?: string): void {
  notify.error(apiErrorMessage(error, fallback))
}
