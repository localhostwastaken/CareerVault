import { Terminal } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { CopyButton } from '@/components/shared/CopyButton'

const COMMANDS = [
  { label: 'Install once', command: 'cd tools/verify-credential && npm install' },
  { label: 'Known-answer vectors, no network', command: 'node verify-credential.mjs --selftest' },
  {
    label: 'Verify a downloaded proof file',
    command: 'node verify-credential.mjs careervault-credential-<id>.jsonld --explain',
  },
]

// The command-line twin of the in-browser checker, for an examiner who wants to see the
// same verdict from code that imports nothing from the server.
export function OfflineCliCard() {
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-seal" aria-hidden />
          <h2 className="text-h2 text-foreground">Offline verifier (terminal)</h2>
        </div>
        <p className="mt-0.5 text-body text-muted-foreground">
          The same checks as the browser checker, from the repository. The Amoy registry is pinned, so no flags are
          needed. Read the summary line, not just the exit code.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {COMMANDS.map(({ label, command }) => (
          <li key={command} className="flex flex-col gap-1.5">
            <span className="label-micro">{label}</span>
            <span className="inset-well flex min-w-0 items-center gap-2 py-1 pl-3 pr-1">
              <code className="tnum min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-micro text-foreground">
                {command}
              </code>
              <CopyButton value={command} label={`Copy: ${label}`} className="size-6" />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
