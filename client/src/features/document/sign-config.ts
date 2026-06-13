import { z } from 'zod'
import type { DocumentType } from './types'

// The fields a manager fills when signing each document type. These become
// contentJson.credentialSubject — the source the PDF renderer and hash use (R4).
export interface SignField {
  name: string
  label: string
  control?: 'text' | 'textarea' | 'date' | 'number'
  optional?: boolean
  placeholder?: string
}

export const SIGN_FIELDS: Record<DocumentType, SignField[]> = {
  EXPERIENCE_LETTER: [
    { name: 'employeeName', label: 'Employee name' },
    { name: 'jobTitle', label: 'Job title' },
    { name: 'department', label: 'Department', optional: true },
    { name: 'startDate', label: 'Start date', control: 'date' },
    { name: 'endDate', label: 'End date', control: 'date', optional: true },
    { name: 'summary', label: 'Summary', control: 'textarea', placeholder: 'Role, responsibilities, and conduct.' },
  ],
  LETTER_OF_RECOMMENDATION: [
    { name: 'candidateName', label: 'Candidate name' },
    { name: 'relationship', label: 'Relationship', placeholder: 'e.g. Direct manager' },
    { name: 'durationKnown', label: 'Known for', optional: true, placeholder: 'e.g. 3 years' },
    { name: 'recommendation', label: 'Recommendation', control: 'textarea' },
  ],
  SALARY_PROOF: [
    { name: 'employeeName', label: 'Employee name' },
    { name: 'jobTitle', label: 'Job title' },
    { name: 'annualSalary', label: 'Annual salary', control: 'number' },
    { name: 'currency', label: 'Currency', placeholder: 'USD' },
    { name: 'asOfDate', label: 'As of date', control: 'date' },
  ],
}

export type SignFormValues = Record<string, string>

export function buildSignSchema(type: DocumentType): z.ZodType<SignFormValues, SignFormValues> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of SIGN_FIELDS[type]) {
    shape[field.name] = field.optional
      ? z.string().trim().optional()
      : z.string().trim().min(1, `${field.label} is required`)
  }
  return z.object(shape) as unknown as z.ZodType<SignFormValues, SignFormValues>
}

// Pre-fill from a prior draft (re-sign after rejection) or start blank.
export function signDefaults(type: DocumentType, contentJson: Record<string, unknown>): SignFormValues {
  const subject = (contentJson.credentialSubject ?? {}) as Record<string, unknown>
  const values: SignFormValues = {}
  for (const field of SIGN_FIELDS[type]) {
    const existing = subject[field.name]
    values[field.name] = existing == null ? '' : String(existing)
  }
  return values
}
