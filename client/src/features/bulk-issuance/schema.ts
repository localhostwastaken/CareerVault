import { z } from 'zod'

export const bulkIssuanceSchema = z.object({
  documentType: z.enum(['EXPERIENCE_LETTER', 'SALARY_PROOF']),
  file: z.instanceof(File, { message: 'Select a CSV file' }),
})

export type BulkIssuanceValues = z.infer<typeof bulkIssuanceSchema>
