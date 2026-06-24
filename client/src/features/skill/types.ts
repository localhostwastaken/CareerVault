export interface ExtractedSkillEntry {
  documentId: string
  documentType: string
  organizationName: string
  skills: string[]
  jobTitle: string | null
  seniority: string | null
  yearsOfExperience: number | null
  industries: string[]
  extractedAt: string
}

export interface MySkills {
  isDiscoverable: boolean
  skills: ExtractedSkillEntry[]
}
