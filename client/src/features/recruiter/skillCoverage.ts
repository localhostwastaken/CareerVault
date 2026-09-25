export interface SkillCoverage {
  required: string[]
  matched: string[]
  missing: string[]
}

// Same rule as the ranker's skill_overlap input (ai-service ranking.py `_skill_overlap`):
// case-insensitive exact match against a de-duplicated required set. Anything looser
// here would show a coverage the model never scored.
export function skillCoverage(requiredSkills: string[], candidateSkills: string[]): SkillCoverage {
  const seen = new Set<string>()
  const required = requiredSkills.filter((skill) => {
    const key = skill.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const have = new Set(candidateSkills.map((skill) => skill.toLowerCase()))
  return {
    required,
    matched: required.filter((skill) => have.has(skill.toLowerCase())),
    missing: required.filter((skill) => !have.has(skill.toLowerCase())),
  }
}
