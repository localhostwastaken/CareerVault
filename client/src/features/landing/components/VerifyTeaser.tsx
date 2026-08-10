import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { extractReference, verifyPath } from '@/features/verification/parse'

// Verification is the product's most persuasive moment, so the landing page lets a
// sceptic run one before reading anything else. Accepts a bare reference or a pasted
// share URL — a recruiter with a link in hand shouldn't have to dissect it.
export function VerifyTeaser() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState(false)

  const reference = extractReference(value)
  const path = verifyPath(reference)
  const showError = touched && value.trim().length > 0 && !path

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (path) navigate(path)
  }

  return (
    <section className="border-t border-border py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
        <p className="label-micro">Try it now</p>
        <h2 className="mt-2 font-serif text-h1 text-foreground sm:text-display sm:leading-tight">
          Have a share link? Check it.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-body-lg text-muted-foreground">
          Paste a CareerVault share link or a document hash. Verification is public, free, and needs no account.
        </p>

        <Card className="mt-8 p-5 text-left">
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <div className="min-w-0 flex-1">
              <label htmlFor="verify-teaser" className="sr-only">
                Share link or document hash
              </label>
              <Input
                id="verify-teaser"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="Paste a share link or 64-character hash"
                className="font-mono text-label"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={showError}
                aria-describedby={showError ? 'verify-teaser-error' : undefined}
              />
            </div>
            <Button type="submit" className="sm:w-auto">
              <ScanLine />
              Verify
            </Button>
          </form>
          {showError && (
            <p id="verify-teaser-error" role="alert" className="mt-2 text-label font-medium text-destructive">
              That isn’t a CareerVault reference. Share tokens are 48 hex characters; hashes are 64.
            </p>
          )}
        </Card>
      </div>
    </section>
  )
}
