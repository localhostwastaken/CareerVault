import { useSelector } from 'react-redux'
import apiConfig from '@/config/APIEndpoints'
import type { RootState } from '@/store'
import { notify } from '@/lib/notify'

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
