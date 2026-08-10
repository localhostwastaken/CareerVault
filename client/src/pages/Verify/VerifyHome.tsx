import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { extractReference, isValidReference, VERIFY_LENGTH, type VerifyMode } from '@/features/verification/parse'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

const MODES: Array<{ value: VerifyMode; label: string; hint: string }> = [
  { value: 'token', label: 'Share link', hint: 'The 48-character token from a CareerVault link.' },
  { value: 'hash', label: 'Document hash', hint: 'The 64-character SHA-256 hash printed on the document.' },
]

const VerifyHome = () => {
  useDocumentTitle('Verify a document')
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<VerifyMode>('token')
  const [touched, setTouched] = useState(false)

  const reference = extractReference(value)
  const valid = isValidReference(reference, mode)
  const showError = touched && reference.length > 0 && !valid
  const active = MODES.find((m) => m.value === mode)!

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!valid) return
    navigate(mode === 'hash' ? `/verify/hash/${reference.toLowerCase()}` : `/verify/${reference}`)
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 lg:px-8">
      <div className="text-center">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl border border-border bg-card text-seal">
          <ShieldCheck className="size-6" />
        </div>
        <h1 className="font-serif text-h1 text-foreground">Verify a document</h1>
        <p className="mx-auto mt-2 max-w-md text-body text-muted-foreground">
          Confirm a document’s signatures, issuer and on-chain anchor. Public, free, and no account required.
        </p>
      </div>

      <Card className="mt-8 p-5">
        {/* Two references, two shapes — the tabs prevent a 48-char token being
            rejected against the 64-char hash rule. */}
        <div role="tablist" aria-label="Reference type" className="mb-5 flex gap-1 rounded-lg bg-surface-2 p-1">
          {MODES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={mode === option.value}
              onClick={() => {
                setMode(option.value)
                setValue('')
                setTouched(false)
              }}
              className={cn(
                'focus-ring flex-1 cursor-pointer rounded-md px-3 py-1.5 text-label font-medium transition-colors',
                mode === option.value
                  ? 'bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="verify-input">{active.label}</Label>
            <Input
              id="verify-input"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={`${VERIFY_LENGTH[mode]}-character hex ${mode}`}
              className="tnum font-mono text-label"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={showError}
              aria-describedby={showError ? 'verify-error' : 'verify-hint'}
            />
            {showError ? (
              <p id="verify-error" role="alert" className="text-label font-medium text-destructive">
                Enter a {VERIFY_LENGTH[mode]}-character hexadecimal {mode}. Pasting the full share link works too.
              </p>
            ) : (
              <p id="verify-hint" className="text-label text-muted-foreground">
                {active.hint}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={!valid}>
            <ScanLine />
            Run verification
          </Button>
        </form>
      </Card>
    </div>
  )
}

export default VerifyHome
