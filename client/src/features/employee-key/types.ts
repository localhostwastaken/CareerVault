// Mirrors server/src/modules/employee-key. The client only ever learns whether a signer is
// enrolled and which questions they chose; no salt, iteration count or key material.
export interface SecurityQuestion {
  id: string
  text: string
}

export interface EmployeeKeyStatus {
  organizationId: string
  organizationName: string
  isEnrolled: boolean
  enrolledAt: string | null
  version: number | null
  questions: SecurityQuestion[]
}

export interface StepUp {
  dateOfBirth: string
  personalId: string
  answers: Array<{ questionId: string; answer: string }>
}

export interface EnrollRequest extends StepUp {
  organizationId: string
  currentStepUp?: StepUp
}
