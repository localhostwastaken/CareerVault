import type { ReactNode } from 'react'
import type { HeadingLevel } from '@/components/shared/Heading'
import { SuccessPanel } from '@/components/shared/SuccessPanel'
import { formatDateTime } from '@/lib/format'

interface AttestationPanelProps {
  title: string
  description?: string
  /** What was attested to, e.g. "Experience Letter for Jane Doe". */
  record: string
  /** Summary label for the signer row: "Signed by", "Approved by", "Revoked by". */
  signerLabel: string
  signerName: string
  /** Server time the attestation was recorded — never the client clock. */
  recordedAt: string
  nextStep: string
  actions?: ReactNode
  headingLevel?: HeadingLevel
}

// The completion state for high-trust actions (sign, approve, revoke). An attestation
// is a record, so it resolves into one: who, what, when, and what happens next.
export function AttestationPanel({
  title,
  description,
  record,
  signerLabel,
  signerName,
  recordedAt,
  nextStep,
  actions,
  headingLevel = 1,
}: AttestationPanelProps) {
  return (
    <SuccessPanel
      headingLevel={headingLevel}
      title={title}
      description={description}
      summary={[
        { label: 'Record', value: record },
        { label: signerLabel, value: signerName },
        { label: 'Recorded', value: formatDateTime(recordedAt) },
        { label: 'Next step', value: nextStep },
      ]}
      actions={actions}
    />
  )
}
