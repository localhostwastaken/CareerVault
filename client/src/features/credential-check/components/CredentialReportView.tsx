import { useState, type ReactNode } from 'react'
import { ExternalLink, Lightbulb, ScanLine, ShieldAlert, ShieldCheck, ShieldQuestion, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { HashDisplay } from '@/components/shared/HashDisplay'
import { DOCUMENT_TYPE_LABEL, type DocumentType } from '@/features/document/types'
import { cn } from '@/lib/utils'
import { CheckResultRow } from './CheckResultRow.tsx'
import type { CredentialReport } from '../types.ts'

const BANNER: Record<'pass' | 'warn' | 'fail' | 'revoked', { title: string; icon: LucideIcon; wrap: string; seal: string }> = {
  pass: { title: 'Proof file verified', icon: ShieldCheck, wrap: 'border-verified/30 bg-verified-soft', seal: 'bg-verified' },
  warn: { title: 'Passed, with a caveat', icon: ShieldQuestion, wrap: 'border-anchor/30 bg-anchor-soft', seal: 'bg-anchor' },
  fail: { title: 'Verification failed', icon: ShieldAlert, wrap: 'border-revoked/30 bg-revoked-soft', seal: 'bg-revoked' },
  revoked: { title: 'Credential revoked', icon: ShieldAlert, wrap: 'border-revoked/30 bg-revoked-soft', seal: 'bg-revoked' },
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="label-micro">{label}</dt>
      <dd className="tnum min-w-0 break-words text-body text-foreground">{children}</dd>
    </div>
  )
}

function OutLink({ href, children }: { href: string | null; children: ReactNode }) {
  if (!href) return null
  return (
    <Button asChild variant="outline" size="sm">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink />
        {children}
      </a>
    </Button>
  )
}

export function CredentialReportView({ report, isEdited }: { report: CredentialReport; isEdited: boolean }) {
  const [isExplained, setIsExplained] = useState(false)
  const tone = report.summary.text.startsWith('REVOKED') ? 'revoked' : report.summary.kind
  const banner = BANNER[tone]
  const typeLabel = DOCUMENT_TYPE_LABEL[report.documentType as DocumentType] ?? report.documentType

  return (
    <div className="flex flex-col gap-6">
      <div role="status" className={cn('flex items-start gap-4 rounded-xl border p-6', banner.wrap)}>
        <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-full text-primary-foreground', banner.seal)}>
          <banner.icon className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-h1 text-foreground">{banner.title}</h2>
          {isEdited && <p className="mt-1 text-label font-semibold text-revoked">This run used your edited content.</p>}
          <p className="mt-1 text-body text-muted-foreground">{report.summary.text}</p>
        </div>
      </div>

      <Card className="flex flex-col gap-5 p-6">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Fact label="Credential">{typeLabel}</Fact>
          <Fact label="Claims issuer">
            {report.issuerName}
            {report.issuerDomain && <span className="text-muted-foreground"> · {report.issuerDomain}</span>}
          </Fact>
          <Fact label="Document hash">
            <HashDisplay value={report.documentHash} lead={12} tail={10} label="Copy document hash" />
          </Fact>
          <Fact label="Issuer key fingerprint · SHA-256 of SPKI">
            {report.keyFingerprint ? (
              <HashDisplay value={report.keyFingerprint} lead={12} tail={10} label="Copy key fingerprint" />
            ) : (
              'Unreadable key'
            )}
          </Fact>
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <a href={`/verify/hash/${report.documentHash}`} target="_blank" rel="noopener noreferrer">
              <ScanLine />
              Cross-check on the public verify page
            </a>
          </Button>
          <OutLink href={report.anchor?.explorerTxUrl ?? null}>Anchoring transaction</OutLink>
          <OutLink href={report.anchor?.explorerContractUrl ?? null}>Registry contract</OutLink>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-h2 text-foreground">Checks run in your browser</h2>
            <p className="mt-0.5 text-body text-muted-foreground">
              {report.rpcUsed ? `On-chain reads answered by ${report.rpcUsed}. ` : ''}No CareerVault API was called.
            </p>
          </div>
          <Button variant="outline" size="sm" aria-pressed={isExplained} onClick={() => setIsExplained((v) => !v)}>
            <Lightbulb />
            {isExplained ? 'Hide the maths' : 'Show the maths'}
          </Button>
        </div>
        <ol className="mt-3">
          {report.lines.map((line) => (
            <CheckResultRow key={line.key} line={line} isExplained={isExplained} />
          ))}
        </ol>
      </Card>
    </div>
  )
}
