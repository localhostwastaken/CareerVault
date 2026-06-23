import { z } from 'zod'

export const requestDocumentSchema = z.object({
  organizationId: z.string().min(1, 'Select an organization'),
  type: z.enum(['EXPERIENCE_LETTER', 'LETTER_OF_RECOMMENDATION', 'SALARY_PROOF']),
  managerUserId: z.string().optional(),
  notes: z.string().max(1000).optional(),
  enableSkillExtraction: z.boolean().optional(),
})
export type RequestDocumentValues = z.infer<typeof requestDocumentSchema>

export const rejectDocumentSchema = z.object({
  reason: z.string().trim().min(1, 'Tell the signer what needs changing').max(500),
})
export type RejectDocumentValues = z.infer<typeof rejectDocumentSchema>

export const revokeDocumentSchema = z.object({
  code: z.enum(['ADMINISTRATIVE_ERROR', 'POLICY_VIOLATION', 'ISSUED_IN_ERROR']),
  reason: z.string().trim().max(500).optional(),
})
export type RevokeDocumentValues = z.infer<typeof revokeDocumentSchema>
