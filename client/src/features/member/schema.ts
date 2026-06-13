import { z } from 'zod'

export const addMemberSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['ORG_ADMIN', 'MANAGER', 'HR', 'RECRUITER']),
  fullName: z.string().optional(),
})
export type AddMemberValues = z.infer<typeof addMemberSchema>
