import { Anchor, Building2, ShieldCheck } from 'lucide-react'
import { EvidenceStrip } from '@/components/shared/EvidenceStrip'
import { skillCoverage } from '@/features/recruiter/skillCoverage'
import type { CredentialEvidence } from '@/features/recruiter/types'
import { formatDate } from '@/lib/format'

interface CandidateEvidenceProps {
  holderName: string
  evidence?: CredentialEvidence
  skills: string[]
  requiredSkills: string[]
}

// Two kinds of evidence, kept apart on purpose: what the candidate can prove (issued,
// anchored credentials) and how their skills line up with this opening.
export function CandidateEvidence({ holderName, evidence, skills, requiredSkills }: CandidateEvidenceProps) {
  const coverage = skillCoverage(requiredSkills, skills)

  return (
    <>
      {evidence && (
        <EvidenceStrip
          label={`Credential evidence for ${holderName}`}
          className="border-t border-border pt-3"
          facts={[
            {
              label: 'Verified credentials',
              value: evidence.verifiedCredentials,
              icon: ShieldCheck,
              tone: evidence.verifiedCredentials > 0 ? 'verified' : undefined,
            },
            {
              label: 'Anchored',
              value: evidence.anchoredCredentials,
              icon: Anchor,
              tone: evidence.anchoredCredentials > 0 ? 'anchor' : undefined,
            },
            { label: 'Issuers', value: evidence.issuers, icon: Building2 },
            { label: 'Latest issued', value: formatDate(evidence.latestIssuedAt) },
          ]}
        />
      )}
      {coverage.required.length > 0 && (
        <EvidenceStrip
          label={`Skill coverage for ${holderName}`}
          className="border-t border-border pt-3"
          facts={[
            {
              label: 'Required skills',
              value: `${coverage.matched.length} of ${coverage.required.length} matched`,
            },
            { label: 'Matched', value: coverage.matched.join(', ') || 'None' },
            ...(coverage.missing.length > 0 ? [{ label: 'Missing', value: coverage.missing.join(', ') }] : []),
          ]}
        />
      )}
    </>
  )
}
