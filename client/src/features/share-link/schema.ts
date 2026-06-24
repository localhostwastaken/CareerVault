import { z } from 'zod'

const optionalCount = (max: number, message: string) =>
  z
    .string()
    .optional()
    .refine((value) => !value || (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= max), message)

// String-typed fields keep the inputs controlled; the page coerces to numbers on submit.
export const createShareLinkSchema = z.object({
  documentId: z.string().min(1, 'Select a document'),
  expiresInDays: optionalCount(365, 'Enter between 1 and 365 days'),
  maxViews: optionalCount(10_000, 'Enter a positive number of views'),
})

export type CreateShareLinkValues = z.infer<typeof createShareLinkSchema>
