import { z } from 'zod'

export const createJobOpeningSchema = z.object({
  title: z.string().min(2, 'Title is required').max(160),
  description: z.string().min(10, 'Add a short description').max(4000),
  requiredSkills: z.string().min(1, 'List at least one skill'),
  seniority: z.enum(['', 'JUNIOR', 'MID', 'SENIOR', 'LEAD']).optional(),
  yearsExpMin: z
    .string()
    .optional()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 50), 'Enter 1–50 years'),
})

export type CreateJobOpeningValues = z.infer<typeof createJobOpeningSchema>
