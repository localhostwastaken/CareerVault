export type BulkBatchStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED'

export interface BulkBatchRowError {
  row: number
  email: string
  error: string
}

export interface BulkBatch {
  id: string
  organizationId: string
  documentType: 'EXPERIENCE_LETTER' | 'SALARY_PROOF'
  status: BulkBatchStatus
  totalRows: number
  processedRows: number
  errorRows: number
  errors: BulkBatchRowError[] | null
  startedAt: string
  completedAt: string | null
}
