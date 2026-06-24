import { z } from 'zod'

export const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name is required'),
  domain: z.string().regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/i, 'Enter a valid domain, e.g. acme.com'),
})
export type CreateOrgValues = z.infer<typeof createOrgSchema>
