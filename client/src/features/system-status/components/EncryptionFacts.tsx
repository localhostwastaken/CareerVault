import { Lock, LockOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EvidenceStripSkeleton } from '@/components/shared/Skeletons'
import { QueryBoundary } from '@/components/shared/QueryBoundary'
import { useGetSystemStatusQuery } from '@/features/system-status/api'
import type { SystemStatus } from '@/features/system-status/types'

function Encryption({ encryption }: { encryption: SystemStatus['encryption'] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="neutral">{encryption.scheme}</Badge>
        {encryption.strict ? (
          <Badge variant="primary">
            <Lock />
            Strict reads on
          </Badge>
        ) : (
          <Badge variant="pending">
            <LockOpen />
            Strict reads off (dev)
          </Badge>
        )}
      </div>
      <p className="text-body text-muted-foreground">
        {encryption.strict
          ? 'Any value in these columns that is not a sealed envelope is refused on read. A row planted straight into the database can neither verify nor be anchored.'
          : 'Legacy plaintext in these columns is still read back, so a database seeded before encryption keeps working. Production turns this on.'}
      </p>
      <ul className="flex flex-wrap gap-2" aria-label="Encrypted columns">
        {encryption.encryptedFields.map((field) => (
          <li key={field} className="inset-well tnum px-2 py-1 font-mono text-micro text-muted-foreground">
            {field}
          </li>
        ))}
      </ul>
    </div>
  )
}

// What a database dump would show: each listed column holds `cvenc:v1:…` ciphertext,
// sealed with a fresh AES-256 data key per row under a key derived from the master key.
export function EncryptionFacts() {
  const query = useGetSystemStatusQuery()

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-seal" aria-hidden />
          <h2 className="text-h2 text-foreground">Encryption at rest</h2>
        </div>
        <p className="mt-0.5 text-body text-muted-foreground">
          The server encrypts these columns before writing them, so the database and its backups only hold ciphertext.
        </p>
      </div>
      <QueryBoundary
        query={query}
        skeleton={<EvidenceStripSkeleton count={3} />}
        errorTitle="Couldn't load the encryption settings"
        headingLevel={3}
      >
        {(status) => <Encryption encryption={status.encryption} />}
      </QueryBoundary>
    </Card>
  )
}
