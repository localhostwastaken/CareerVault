import { z } from 'zod'
import type { DocumentType } from './types'

// The fields a signer fills per document type. These are sent FLAT as contentJson
// (no credentialSubject wrapper) — the server validates against the per-type schema,
// stores the flat subject, then injects schemaVersion/issueDate/referenceNumber itself.
// Money is entered in ₹ and transmitted as integer paise under `${name}Paise`.

export type SignControl = 'text' | 'textarea' | 'date' | 'select' | 'checkbox' | 'money' | 'email'

export interface SignFieldOption {
  value: string
  label: string
}

export interface SignField {
  name: string
  label: string
  control: SignControl
  /** Undefined = shown first; 'more' = revealed under "Add more detail". */
  section?: 'more'
  optional?: boolean
  /** Required only when letterKind !== EXPERIENCE; hidden otherwise. */
  conditionalRequired?: boolean
  separationOnly?: boolean
  options?: readonly SignFieldOption[]
  placeholder?: string
  help?: string
  /** Min length for text/textarea (mirrors the server DTO). */
  min?: number
  max?: number
  pattern?: RegExp
  patternMessage?: string
  default?: string
  prefill?: 'holderName' | 'organizationName'
}

export type SignFormValues = Record<string, string | boolean>

const opts = (map: Record<string, string>): SignFieldOption[] =>
  Object.entries(map).map(([value, label]) => ({ value, label }))

const LETTER_KIND = opts({
  EXPERIENCE: 'Experience',
  RELIEVING: 'Relieving',
  EXPERIENCE_CUM_RELIEVING: 'Experience-cum-relieving',
})
const EXP_EMPLOYMENT_TYPE = opts({
  FULL_TIME: 'Full-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
  CONSULTANT: 'Consultant',
})
const REASON_FOR_LEAVING = opts({
  RESIGNATION: 'Resignation',
  TERMINATION: 'Termination',
  MUTUAL_SEPARATION: 'Mutual separation',
  CONTRACT_END: 'Contract end',
  RETIREMENT: 'Retirement',
})
const NOTICE_PERIOD = opts({
  SERVED_IN_FULL: 'Served in full',
  WAIVED: 'Waived',
  SHORTFALL_RECOVERED: 'Shortfall recovered',
  PAY_IN_LIEU: 'Pay in lieu',
})
const PAY_FREQUENCY = opts({ MONTHLY: 'Monthly', ANNUAL: 'Annual' })
const EMPLOYMENT_STATUS = opts({ ACTIVE: 'Active', ON_NOTICE: 'On notice' })
const SALARY_EMPLOYMENT_TYPE = opts({
  PERMANENT: 'Permanent',
  FIXED_TERM_CONTRACT: 'Fixed-term contract',
  PROBATION: 'Probation',
  INTERN: 'Intern',
  CONSULTANT: 'Consultant',
})
const SALARY_PURPOSE = opts({
  GENERAL: 'General',
  HOME_LOAN: 'Home loan',
  VEHICLE_LOAN: 'Vehicle loan',
  PERSONAL_LOAN: 'Personal loan',
  CREDIT_CARD: 'Credit card',
  RENTAL_AGREEMENT: 'Rental agreement',
  VISA_APPLICATION: 'Visa application',
  BACKGROUND_VERIFICATION: 'Background verification',
})
const LOR_RELATIONSHIP = opts({
  DIRECT_SUPERVISOR: 'Direct supervisor',
  SKIP_LEVEL: 'Skip-level manager',
  DEPARTMENT_HEAD: 'Department head',
  PEER: 'Peer',
  CROSS_FUNCTIONAL: 'Cross-functional partner',
  MENTOR: 'Mentor',
  CLIENT: 'Client',
  VENDOR_PARTNER: 'Vendor / partner',
  PROFESSOR: 'Professor',
  RESEARCH_GUIDE: 'Research guide',
})
const LOR_STRENGTH = opts({
  STRONGLY_RECOMMEND: 'Strongly recommend',
  RECOMMEND: 'Recommend',
  RECOMMEND_WITH_RESERVATIONS: 'Recommend with reservations',
})
const LOR_CONTEXT = opts({
  HIGHER_EDUCATION: 'Higher education',
  EMPLOYMENT: 'Employment',
  INTERNAL_PROMOTION: 'Internal promotion',
  IMMIGRATION_VISA: 'Immigration / visa',
  SCHOLARSHIP_FELLOWSHIP: 'Scholarship / fellowship',
  PROFESSIONAL_MEMBERSHIP: 'Professional membership',
  GENERAL: 'General',
})

export const SIGN_FIELDS: Record<DocumentType, SignField[]> = {
  EXPERIENCE_LETTER: [
    { name: 'letterKind', label: 'Letter type', control: 'select', options: LETTER_KIND, default: 'EXPERIENCE' },
    { name: 'employeeName', label: 'Employee name', control: 'text', min: 2, max: 120, prefill: 'holderName' },
    { name: 'employeeCode', label: 'Employee code', control: 'text', min: 1, max: 64 },
    { name: 'designation', label: 'Designation', control: 'text', min: 2, max: 120 },
    { name: 'employmentType', label: 'Employment type', control: 'select', options: EXP_EMPLOYMENT_TYPE, default: 'FULL_TIME' },
    { name: 'dateOfJoining', label: 'Date of joining', control: 'date' },
    { name: 'lastWorkingDay', label: 'Last working day', control: 'date', conditionalRequired: true, separationOnly: true },
    {
      name: 'conductSummary',
      label: 'Conduct summary',
      control: 'textarea',
      min: 20,
      max: 2000,
      placeholder: 'Role, responsibilities, and conduct during employment.',
    },
    { name: 'signatoryName', label: 'Signatory name', control: 'text', min: 2, max: 120, prefill: 'organizationName' },
    { name: 'signatoryDesignation', label: 'Signatory designation', control: 'text', min: 2, max: 120, default: 'Head — Human Resources' },

    // ── Add more detail ──────────────────────────────────────────────────────
    {
      name: 'reasonForLeaving',
      label: 'Reason for leaving',
      control: 'select',
      section: 'more',
      options: REASON_FOR_LEAVING,
      conditionalRequired: true,
      separationOnly: true,
    },
    { name: 'noticePeriodServed', label: 'Notice period served', control: 'select', section: 'more', options: NOTICE_PERIOD, optional: true },
    { name: 'duesSettled', label: 'All dues settled', control: 'checkbox', section: 'more', optional: true },
    { name: 'department', label: 'Department', control: 'text', section: 'more', optional: true, max: 120 },
    { name: 'workLocation', label: 'Work location', control: 'text', section: 'more', optional: true, max: 120 },
    { name: 'reportingManager', label: 'Reporting manager', control: 'text', section: 'more', optional: true, max: 120 },
    { name: 'placeOfIssue', label: 'Place of issue', control: 'text', section: 'more', optional: true, max: 80 },
    { name: 'lastDrawnCtc', label: 'Last drawn CTC', control: 'money', section: 'more', optional: true, help: 'Confidential — kept off the public verification view.' },
  ],
  SALARY_PROOF: [
    { name: 'payFrequency', label: 'Pay frequency', control: 'select', options: PAY_FREQUENCY, default: 'MONTHLY' },
    { name: 'periodStart', label: 'Period start', control: 'date' },
    { name: 'periodEnd', label: 'Period end', control: 'date' },
    { name: 'employeeName', label: 'Employee name', control: 'text', min: 2, max: 120, prefill: 'holderName' },
    { name: 'employeeCode', label: 'Employee code', control: 'text', min: 1, max: 64 },
    { name: 'designation', label: 'Designation', control: 'text', min: 2, max: 120 },
    { name: 'employmentStatus', label: 'Employment status', control: 'select', options: EMPLOYMENT_STATUS, default: 'ACTIVE' },
    { name: 'dateOfJoining', label: 'Date of joining', control: 'date' },
    { name: 'basic', label: 'Basic', control: 'money' },
    { name: 'hra', label: 'HRA', control: 'money' },
    { name: 'specialAllowance', label: 'Special allowance', control: 'money' },
    { name: 'pfEmployee', label: 'PF (employee)', control: 'money' },
    { name: 'professionalTax', label: 'Professional tax', control: 'money', default: '200' },
    { name: 'incomeTaxTds', label: 'Income tax (TDS)', control: 'money' },
    { name: 'signatoryName', label: 'Signatory name', control: 'text', min: 2, max: 120, prefill: 'organizationName' },
    { name: 'signatoryDesignation', label: 'Signatory designation', control: 'text', min: 2, max: 120, default: 'Head of Human Resources' },

    // ── Add more detail ──────────────────────────────────────────────────────
    { name: 'department', label: 'Department', control: 'text', section: 'more', optional: true, max: 120 },
    { name: 'employmentType', label: 'Employment type', control: 'select', section: 'more', options: SALARY_EMPLOYMENT_TYPE, optional: true },
    { name: 'workLocation', label: 'Work location', control: 'text', section: 'more', optional: true, max: 120 },
    { name: 'lta', label: 'LTA', control: 'money', section: 'more', optional: true },
    { name: 'conveyanceAllowance', label: 'Conveyance allowance', control: 'money', section: 'more', optional: true },
    { name: 'medicalAllowance', label: 'Medical allowance', control: 'money', section: 'more', optional: true },
    { name: 'variablePay', label: 'Variable pay', control: 'money', section: 'more', optional: true },
    { name: 'esiEmployee', label: 'ESI (employee)', control: 'money', section: 'more', optional: true },
    { name: 'otherDeductions', label: 'Other deductions', control: 'money', section: 'more', optional: true },
    { name: 'employerPf', label: 'Employer PF', control: 'money', section: 'more', optional: true },
    { name: 'gratuity', label: 'Gratuity', control: 'money', section: 'more', optional: true },
    { name: 'annualCtc', label: 'Annual CTC', control: 'money', section: 'more', optional: true },
    {
      name: 'panMasked',
      label: 'PAN (masked)',
      control: 'text',
      section: 'more',
      optional: true,
      pattern: /^X{5}\d{4}[A-Z]$/,
      patternMessage: 'Use the masked form, e.g. XXXXX4821K',
      placeholder: 'XXXXX4821K',
    },
    {
      name: 'uanNumber',
      label: 'UAN number',
      control: 'text',
      section: 'more',
      optional: true,
      pattern: /^\d{12}$/,
      patternMessage: 'UAN is 12 digits',
    },
    { name: 'purpose', label: 'Purpose', control: 'select', section: 'more', options: SALARY_PURPOSE, optional: true },
    { name: 'remarks', label: 'Remarks', control: 'textarea', section: 'more', optional: true, max: 280 },
  ],
  LETTER_OF_RECOMMENDATION: [
    { name: 'candidateName', label: 'Candidate name', control: 'text', min: 2, max: 120, prefill: 'holderName' },
    { name: 'recommenderName', label: 'Recommender name', control: 'text', min: 2, max: 120, prefill: 'organizationName' },
    { name: 'recommenderTitle', label: 'Recommender title', control: 'text', min: 2, max: 120 },
    { name: 'recommenderEmail', label: 'Recommender email', control: 'email' },
    { name: 'relationshipType', label: 'Relationship', control: 'select', options: LOR_RELATIONSHIP },
    { name: 'organizationContext', label: 'Organization context', control: 'text', min: 2, max: 160, prefill: 'organizationName' },
    { name: 'relationshipStartDate', label: 'Known since', control: 'date' },
    { name: 'overallAssessment', label: 'Overall assessment', control: 'textarea', min: 40, max: 4000, placeholder: 'Strengths, impact, and why you recommend this candidate.' },

    // ── Add more detail ──────────────────────────────────────────────────────
    { name: 'relationshipEndDate', label: 'Known until', control: 'date', section: 'more', optional: true },
    { name: 'candidateTitle', label: 'Candidate title', control: 'text', section: 'more', optional: true, min: 2, max: 120 },
    { name: 'endorsementStrength', label: 'Endorsement strength', control: 'select', section: 'more', options: LOR_STRENGTH, optional: true },
    { name: 'recommendationContext', label: 'Recommendation for', control: 'select', section: 'more', options: LOR_CONTEXT, optional: true },
    {
      name: 'recommenderPhone',
      label: 'Recommender phone',
      control: 'text',
      section: 'more',
      optional: true,
      pattern: /^\+?[0-9][0-9\s-]{7,14}$/,
      patternMessage: 'Enter a valid phone number',
    },
  ],
}

// Earnings/deductions used for the client-side gross/net readout. The SERVER recomputes
// these authoritatively — this is display only.
export const SALARY_EARNING_KEYS = ['basic', 'hra', 'specialAllowance', 'lta', 'conveyanceAllowance', 'medicalAllowance', 'variablePay'] as const
export const SALARY_DEDUCTION_KEYS = ['pfEmployee', 'professionalTax', 'incomeTaxTds', 'esiEmployee', 'otherDeductions'] as const

/** The contentJson key a field maps to (money fields append `Paise`). */
export function outputKey(field: SignField): string {
  return field.control === 'money' ? `${field.name}Paise` : field.name
}

/** ₹ → integer paise; `undefined` for blank so empty optionals can be omitted. */
export function rupeesToPaise(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[,\s]/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) : undefined
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const blankToUndef = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v)
const numberFrom = (v: unknown) => {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const cleaned = v.replace(/[,\s]/g, '')
    if (cleaned === '') return undefined
    const n = Number(cleaned)
    return Number.isNaN(n) ? v : n
  }
  return v
}

function optionalWrap(schema: z.ZodType): z.ZodType {
  return z.preprocess(blankToUndef, schema.optional())
}

function moneySchema(optional: boolean): z.ZodType {
  const num = z.number({ error: 'Enter an amount in ₹' }).min(0, 'Cannot be negative')
  return z.preprocess(numberFrom, optional ? num.optional() : num)
}

function fieldSchema(field: SignField): z.ZodType {
  const optional = field.optional === true || field.conditionalRequired === true
  switch (field.control) {
    case 'checkbox':
      return z.boolean().optional()
    case 'money':
      return moneySchema(optional)
    case 'select': {
      const values = field.options!.map((o) => o.value) as [string, ...string[]]
      const base = z.enum(values, { error: `Select ${field.label.toLowerCase()}` })
      return optional ? optionalWrap(base) : base
    }
    case 'date': {
      const base = z.string().regex(DATE_RE, 'Enter a valid date')
      return optional ? optionalWrap(base) : base
    }
    case 'email': {
      const base = z.email({ error: 'Enter a valid email address' })
      return optional ? optionalWrap(base) : base
    }
    default: {
      let base = z.string().trim().min(field.min ?? 1, field.min ? `Enter at least ${field.min} characters` : `${field.label} is required`)
      if (field.max) base = base.max(field.max)
      if (field.pattern) base = base.regex(field.pattern, field.patternMessage ?? 'Invalid format')
      return optional ? optionalWrap(base) : base
    }
  }
}

export function buildSignSchema(type: DocumentType): z.ZodType<SignFormValues, SignFormValues> {
  const shape: Record<string, z.ZodType> = {}
  for (const field of SIGN_FIELDS[type]) shape[field.name] = fieldSchema(field)
  let schema: z.ZodType = z.object(shape)

  if (type === 'EXPERIENCE_LETTER') {
    // lastWorkingDay + reasonForLeaving are mandatory once the letter certifies a
    // separation (letterKind !== EXPERIENCE); optional for a still-employed record.
    const asRecord = (v: unknown) => v as Record<string, unknown>
    schema = schema
      .refine((v) => asRecord(v).letterKind === 'EXPERIENCE' || Boolean(asRecord(v).lastWorkingDay), {
        path: ['lastWorkingDay'],
        error: 'Required unless the employee is still employed',
      })
      .refine((v) => asRecord(v).letterKind === 'EXPERIENCE' || Boolean(asRecord(v).reasonForLeaving), {
        path: ['reasonForLeaving'],
        error: 'Required for a relieving letter',
      })
  }

  return schema as unknown as z.ZodType<SignFormValues, SignFormValues>
}

interface SignSource {
  holderName: string
  organizationName: string
  contentJson: Record<string, unknown>
}

// Prefill from the request (holder/org, editable) and re-hydrate a rejected draft's
// prior content — money comes back from paise, everything else verbatim.
export function signDefaults(type: DocumentType, source: SignSource): SignFormValues {
  const content = source.contentJson ?? {}
  const values: SignFormValues = {}
  for (const field of SIGN_FIELDS[type]) {
    const existing = content[outputKey(field)]
    if (field.control === 'checkbox') {
      values[field.name] = typeof existing === 'boolean' ? existing : false
      continue
    }
    if (field.control === 'money') {
      values[field.name] = typeof existing === 'number' ? String(existing / 100) : (field.default ?? '')
      continue
    }
    if (existing != null && existing !== '') {
      values[field.name] = String(existing)
      continue
    }
    let value = field.default ?? ''
    if (field.prefill === 'holderName' && source.holderName) value = source.holderName
    if (field.prefill === 'organizationName' && source.organizationName) value = source.organizationName
    values[field.name] = value
  }
  return values
}
