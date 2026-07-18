import { useSelector } from 'react-redux'
import apiConfig from '@/config/APIEndpoints'
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

// PDF download needs the auth header, so we fetch the blob and open it (not a plain link).
export function useDownloadDocument() {
  const token = useSelector((state: RootState) => state.auth.token)
  return async (documentId: string) => {
    try {
      const response = await fetch(`${apiConfig.getEndpoint()}/documents/${documentId}/download`, {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      })
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
  const token = useSelector((state: RootState) => state.auth.token)
  return async (documentId: string) => {
    try {
      const response = await fetch(`${apiConfig.getEndpoint()}/documents/${documentId}/credential`, {
        headers: token ? { authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      })
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
