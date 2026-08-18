import { useStore } from 'react-redux'
import { refreshSession } from '@/apis/APISlice'
import apiConfig from '@/config/APIEndpoints'
import { logout } from '@/features/auth/authSlice'
import { useAppDispatch } from '@/hooks/useAuth'
import type { RootState } from '@/store'
import { notify } from '@/lib/notify'
import { useListDocumentsQuery } from './api'
import type { DocumentDetail, DocumentType } from './types'

const OPEN_REQUEST_STATUSES = ['REQUESTED', 'DRAFT', 'PENDING_HR']

// Warns a holder before filing a second request for the same document type at the same
// org while one is still open. Best-effort: the list endpoint returns only the first page
// (the APISlice unwrap drops pagination meta), so very old duplicates may be missed.
export function useHolderDuplicateRequest(organizationId: string, type: DocumentType): DocumentDetail | null {
  const { data } = useListDocumentsQuery({ role: 'HOLDER' })
  if (!organizationId) return null
  return (
    (data ?? []).find(
      (doc) => doc.organizationId === organizationId && doc.type === type && OPEN_REQUEST_STATUSES.includes(doc.status),
    ) ?? null
  )
}

// The two file downloads below can't go through RTK Query — they return a binary/attachment
// body, not the JSON envelope. Without this they would be the only authenticated requests in
// the app with no 401 recovery, so an expired access token turned a download into a bare
// error toast. Mirrors the baseQuery: one shared refresh, then one retry. The token is read
// from the store per attempt so the retry picks up the refreshed one.
function useAuthedFileFetch() {
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()
  return async (path: string): Promise<Response> => {
    const send = () => {
      const token = store.getState().auth.token
      return fetch(`${apiConfig.getEndpoint()}${path}`, {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      })
    }
    const response = await send()
    if (response.status !== 401) return response
    if (!(await refreshSession(dispatch))) {
      dispatch(logout())
      return response
    }
    return send()
  }
}

// PDF download needs the auth header, so we fetch the blob and open it (not a plain link).
export function useDownloadDocument() {
  const authedFetch = useAuthedFileFetch()
  return async (documentId: string) => {
    try {
      const response = await authedFetch(`/documents/${documentId}/download`)
      if (!response.ok) throw new Error('download failed')
      const url = URL.createObjectURL(await response.blob())
      window.open(url, '_blank', 'noopener')
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      notify.error('Could not download the document')
    }
  }
}

// The JSON-LD verification credential embeds the salt + signatures + Merkle proof so the
// holder can verify authenticity offline. Saved as a file (not opened) like any attachment.
export function useDownloadCredential() {
  const authedFetch = useAuthedFileFetch()
  return async (documentId: string) => {
    try {
      const response = await authedFetch(`/documents/${documentId}/credential`)
      if (!response.ok) throw new Error('download failed')
      const url = URL.createObjectURL(await response.blob())
      const link = window.document.createElement('a')
      link.href = url
      link.download = `careervault-credential-${documentId}.jsonld`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch {
      notify.error('Could not download the verification credential')
    }
  }
}
