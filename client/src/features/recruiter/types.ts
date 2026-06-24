export type Seniority = 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD'

export interface JobOpening {
  id: string
  title: string
  description: string
  requiredSkills: string[]
  seniority: Seniority | null
  yearsExpMin: number | null
  closedAt: string | null
  createdAt: string
  matchCount: number
}

export interface CreateJobOpeningRequest {
  title: string
  description: string
  requiredSkills: string[]
  seniority?: Seniority
  yearsExpMin?: number
}

export interface ShapContribution {
  feature: string
  value: number
  shap_value: number
}

export interface MatchCandidate {
  holderId: string
  holderName: string
  skills: string[]
  matchScore: number
  baseValue: number
  contributions: ShapContribution[]
}

export interface SearchResult {
  jobOpeningId: string
  modelVersion: string | null
  matches: MatchCandidate[]
}

export interface StoredMatch {
  holderId: string
  holderName: string
  skills: string[]
  matchScore: number
  explanation: { baseValue: number; contributions: ShapContribution[] } | null
  createdAt: string
}
