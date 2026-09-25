import type { ReactNode } from 'react'
import type { DocumentDetail } from '@/features/document/types'
import { formatRelativeTime } from '@/lib/format'

function Step({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-2 border-t border-border pt-4 first:border-t-2 first:border-rule-strong">
      <p className="label-micro">
        <span className="tnum">{number}</span> / {title}
      </p>
      <div className="flex flex-col gap-1.5 text-body text-foreground">{children}</div>
    </li>
  )
}

interface SigningCeremonyProps {
  document: DocumentDetail
  signerName: string
  note: string | null
}

// Signing is an attestation, not a form submission. The rail says, in order, who it is
// for, what the record is, exactly what gets signed, and what signing sets in motion —
// before the fields, so the signature is informed rather than a click.
export function SigningCeremony({ document, signerName, note }: SigningCeremonyProps) {
  return (
    <ol aria-label="Signing ceremony" className="flex flex-col gap-5">
      <Step number="01" title="Holder">
        <p className="font-semibold">{document.holderName}</p>
        <p className="break-all text-label text-muted-foreground">{document.holderEmail}</p>
        <p className="tnum text-label text-subtle">Requested {formatRelativeTime(document.createdAt)}</p>
        {note && (
          <blockquote className="inset-well mt-1 p-3 text-label text-foreground">
            <span className="label-micro mb-1 block">What they asked for</span>
            {note}
          </blockquote>
        )}
      </Step>
      <Step number="02" title="Record">
        <p className="text-label text-muted-foreground">
          The fields you complete become the signed content. Empty optional fields are left out.
        </p>
      </Step>
      <Step number="03" title="Attestation">
        <p className="text-label text-muted-foreground">
          You sign a <span className="font-mono text-foreground">MANAGER</span> statement binding this record's content
          hash to your membership, with {document.organizationName}'s signing key.
        </p>
        <p className="text-label">
          <span className="text-muted-foreground">Signer </span>
          <span className="font-semibold">{signerName}</span>
        </p>
      </Step>
      <Step number="04" title="Sign">
        <p className="text-label text-muted-foreground">
          HR co-signs next. The document is issued only once both signatures exist, then anchored in the next batch.
        </p>
      </Step>
    </ol>
  )
}
