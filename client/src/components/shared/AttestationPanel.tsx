import type { ReactNode } from 'react'
import type { HeadingLevel } from '@/components/shared/Heading'
import { SuccessPanel, type SummaryRow } from '@/components/shared/SuccessPanel'
import { formatDateTime } from '@/lib/format'

interface AttestationPanelProps {
  title: string
  description?: string
  /** What was attested to, e.g. "Experience Letter for Jane Doe". */
  record: string
  /** The identifier the record now carries, e.g. its printed reference number. */
  reference?: string
  /** Summary label for the signer row: "Signed by", "Approved by", "Revoked by". */
  signerLabel: string
  signerName: string
  /** Server time the attestation was recorded — never the client clock. */
  recordedAt: string
  nextStep: string
  /** Where the record now stands in its lifecycle, e.g. a Stepper. */
  progress?: ReactNode
  actions?: ReactNode
  headingLevel?: HeadingLevel
}

// The completion state for high-trust actions (sign, approve, revoke). An attestation
// is a record, so it resolves into one: who, what, when, and what happens next.
export function AttestationPanel({
  title,
  description,
  record,
  reference,
  signerLabel,
  signerName,
  recordedAt,
  nextStep,
  progress,
  actions,
  headingLevel = 1,
}: AttestationPanelProps) {
  const summary: SummaryRow[] = [
    { label: 'Record', value: record },
    ...(reference ? [{ label: 'Reference', value: <span className="font-mono">{reference}</span> }] : []),
    { label: signerLabel, value: signerName },
    { label: 'Recorded', value: formatDateTime(recordedAt) },
    { label: 'Next step', value: nextStep },
  ]

  return (
    <SuccessPanel
      headingLevel={headingLevel}
      title={title}
      description={description}
      summary={summary}
      artifact={progress && <div className="border-t border-verified/20 pt-4">{progress}</div>}
      actions={actions}
    />
  )
}
