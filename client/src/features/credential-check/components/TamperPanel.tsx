import { useState } from 'react'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import type { Credential } from '../types.ts'

interface TamperPanelProps {
  credential: Credential
  onRun: (edited: Credential) => void
  isRunning: boolean
}

const pretty = (value: unknown) => JSON.stringify(value, null, 2)

// The tamper test from the viva script, without a text editor and a terminal: change one
// character of the signed content and watch Integrity fail while the signatures still pass,
// because they sign the recorded hash, not the edited bytes.
export function TamperPanel({ credential, onRun, isRunning }: TamperPanelProps) {
  const [text, setText] = useState(() => pretty(credential.credentialSubject))
  const [error, setError] = useState<string | null>(null)
  const isChanged = text !== pretty(credential.credentialSubject)

  const run = () => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setError('That is no longer valid JSON. Fix the edit, or restore the original.')
      return
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setError('The content must stay a JSON object.')
      return
    }
    setError(null)
    onRun({ ...credential, credentialSubject: parsed as Record<string, unknown> })
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div>
        <div className="flex items-center gap-2">
          <FlaskConical className="size-4 text-seal" aria-hidden />
          <h2 className="text-h2 text-foreground">Try to tamper with it</h2>
        </div>
        <p className="mt-0.5 text-body text-muted-foreground">
          This is the signed content from the file. Change anything, even one digit of a date, and run the checks again.
          The edit stays in this browser tab.
        </p>
      </div>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={10}
        spellCheck={false}
        aria-label="Signed content (credentialSubject)"
        aria-invalid={Boolean(error)}
        className="tnum font-mono text-micro"
      />
      {error && (
        <p role="alert" className="text-label font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={run} disabled={!isChanged || isRunning}>
          <FlaskConical />
          Re-run with my edit
        </Button>
        <Button
          variant="outline"
          disabled={!isChanged || isRunning}
          onClick={() => {
            setText(pretty(credential.credentialSubject))
            setError(null)
            onRun(credential)
          }}
        >
          <RotateCcw />
          Restore and re-run original
        </Button>
      </div>
    </Card>
  )
}
