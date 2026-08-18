import { z } from 'zod'

export const addMemberSchema = z.object({
  email: z.string().email('Enter a valid email'),
  role: z.enum(['ORG_ADMIN', 'MANAGER', 'HR', 'RECRUITER']),
  // Blank (the default, since it's optional) must stay valid; a name that's actually typed must meet the server's @MinLength(2) or it 400s on submit.
  fullName: z.union([z.literal(''), z.string().min(2, 'At least 2 characters')]).optional(),
})
export type AddMemberValues = z.infer<typeof addMemberSchema>
