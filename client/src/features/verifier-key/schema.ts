import { z } from 'zod'

export const createVerifierKeySchema = z.object({
  name: z.string().max(100).optional(),
})

export type CreateVerifierKeyValues = z.infer<typeof createVerifierKeySchema>
