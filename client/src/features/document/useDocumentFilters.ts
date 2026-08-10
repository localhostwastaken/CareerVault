import { useMemo } from 'react'
import type { FilterOption } from '@/components/shared/FilterBar'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail, type DocumentStatus } from '@/features/document/types'

export const DOCUMENT_SORTS: FilterOption[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'type', label: 'By type' },
  { value: 'organization', label: 'By organisation' },
]

// Grouped rather than one chip per raw status — seven chips is noise, and "In progress"
// is how holders actually think about the pre-issuance statuses.
const GROUPS: Record<string, DocumentStatus[]> = {
  progress: ['REQUESTED', 'DRAFT', 'PENDING_HR'],
  issued: ['ISSUED', 'ANCHORED'],
  revoked: ['REVOKED'],
  expired: ['EXPIRED'],
}

const GROUP_LABEL: Record<keyof typeof GROUPS, string> = {
  progress: 'In progress',
  issued: 'Issued',
  revoked: 'Revoked',
  expired: 'Expired',
}

function sortDate(doc: DocumentDetail): number {
  return new Date(doc.issuedAt ?? doc.createdAt).getTime()
}

interface Args {
  documents: DocumentDetail[]
  search: string
  status: string
  sort: string
}

interface Result {
  visible: DocumentDetail[]
  /** Chips carry live counts, so an empty filter is obvious before it is clicked. */
  statusOptions: FilterOption[]
}

export function useDocumentFilters({ documents, search, status, sort }: Args): Result {
  return useMemo(() => {
    const statusOptions = (Object.keys(GROUPS) as Array<keyof typeof GROUPS>)
      .map((key) => ({
        value: key,
        label: GROUP_LABEL[key],
        count: documents.filter((doc) => GROUPS[key].includes(doc.status)).length,
      }))
      .filter((option) => option.count > 0)

    const needle = search.trim().toLowerCase()
    const allowed = GROUPS[status]

    const visible = documents
      .filter((doc) => !allowed || allowed.includes(doc.status))
      .filter((doc) => {
        if (!needle) return true
        return (
          DOCUMENT_TYPE_LABEL[doc.type].toLowerCase().includes(needle) ||
          doc.organizationName.toLowerCase().includes(needle) ||
          doc.holderName.toLowerCase().includes(needle)
        )
      })
      .sort((a, b) => {
        switch (sort) {
          case 'oldest':
            return sortDate(a) - sortDate(b)
          case 'type':
            return DOCUMENT_TYPE_LABEL[a.type].localeCompare(DOCUMENT_TYPE_LABEL[b.type])
          case 'organization':
            return a.organizationName.localeCompare(b.organizationName)
          default:
            return sortDate(b) - sortDate(a)
        }
      })

    return { visible, statusOptions }
  }, [documents, search, status, sort])
}
