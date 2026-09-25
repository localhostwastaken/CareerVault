import { Link } from 'react-router-dom'
import { Anchor } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { DocumentCard } from '@/features/document/components/DocumentCard'
import { documentProgress, isReturned } from '@/features/document/documentProgress'
import { documentReference } from '@/features/document/reference'
import { DOCUMENT_TYPE_LABEL, type DocumentDetail } from '@/features/document/types'
import { formatDate } from '@/lib/format'

function Dates({ document }: { document: DocumentDetail }) {
  if (!document.issuedAt) {
    return <p className="tnum text-label text-muted-foreground">Requested {formatDate(document.createdAt)}</p>
  }
  return (
    <>
      <p className="tnum text-label text-foreground">Issued {formatDate(document.issuedAt)}</p>
      <p className="tnum text-label text-subtle">
        {document.expiresAt ? `Expires ${formatDate(document.expiresAt)}` : 'No expiry'}
      </p>
    </>
  )
}

function Verification({ document }: { document: DocumentDetail }) {
  const returned = isReturned(document)
  return (
    <div className="flex flex-col items-start gap-1.5">
      <StatusBadge status={returned ? 'DRAFT' : document.status} label={returned ? 'Returned' : undefined} />
      {/* The ANCHORED badge already says it; the line matters when the status has moved
          on (e.g. revoked) but the anchor still stands. */}
      {document.status === 'ANCHORED' ? null : document.merkleStatus === 'ANCHORED' ? (
        <p className="flex items-center gap-1.5 text-label text-anchor">
          <Anchor className="size-3.5" aria-hidden />
          Anchored on-chain
        </p>
      ) : document.merkleStatus === 'PENDING_BATCH' ? (
        <p className="text-label text-subtle">Anchoring in the next batch</p>
      ) : (
        <p className="text-label text-subtle">{documentProgress(document).short}</p>
      )}
    </div>
  )
}

// The holder's archive as a register: each credential's identity, issuer, dates and
// verification state in one scannable row. Below lg the index-card rows take over.
export function CredentialRegister({ documents }: { documents: DocumentDetail[] }) {
  return (
    <>
      <Card className="hidden overflow-hidden lg:block">
        <Table>
          <caption className="sr-only">Your credentials</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4">Credential</TableHead>
              <TableHead>Issuer</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="pr-4">Verification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell className="pl-4 align-top">
                  <Link
                    to={`/app/documents/${document.id}`}
                    className="focus-ring rounded text-label font-semibold text-foreground hover:text-seal hover:underline"
                  >
                    {DOCUMENT_TYPE_LABEL[document.type]}
                  </Link>
                  <p className="tnum mt-1 whitespace-nowrap font-mono text-micro text-subtle">
                    {documentReference(document)}
                  </p>
                </TableCell>
                <TableCell className="align-top text-label text-foreground">{document.organizationName}</TableCell>
                <TableCell className="whitespace-nowrap align-top">
                  <Dates document={document} />
                </TableCell>
                <TableCell className="pr-4 align-top">
                  <Verification document={document} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex flex-col gap-3 lg:hidden">
        {documents.map((document) => (
          <DocumentCard key={document.id} document={document} />
        ))}
      </div>
    </>
  )
}
