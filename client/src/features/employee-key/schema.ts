import { z } from 'zod'

// Mirrors EmployeeSecretsDto on the server so a value it would reject fails here first.
const answer = z.object({
  questionId: z.string().min(1, 'Choose a question'),
  answer: z.string().trim().min(2, 'At least 2 characters').max(100, 'At most 100 characters'),
})

export const stepUpSchema = z.object({
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth'),
  personalId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9 -]{2,30}[A-Za-z0-9]$/, '4–32 letters, digits, spaces or hyphens'),
  answers: z.array(answer).length(3),
})
export type StepUpValues = z.infer<typeof stepUpSchema>

export const enrollSchema = stepUpSchema.refine(
  (values) => new Set(values.answers.map((a) => a.questionId)).size === values.answers.length,
  { message: 'Choose three different questions', path: ['answers', 2, 'questionId'] },
)

export const emptyStepUp = (questionIds: string[] = ['', '', '']): StepUpValues => ({
  dateOfBirth: '',
  personalId: '',
  answers: questionIds.map((questionId) => ({ questionId, answer: '' })),
})

// Replacing an enrolled key also asks for the current details (`current`); a first
// enrolment has none.
export const enrollFormSchema = z.object({ next: enrollSchema, current: stepUpSchema.optional() })
export type EnrollFormValues = z.infer<typeof enrollFormSchema>
