import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

const HASH_PATTERN = /^[0-9a-f]{64}$/i

const VerifyHome = () => {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const trimmed = value.trim()
  const valid = HASH_PATTERN.test(trimmed)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (valid) navigate(`/verify/hash/${trimmed.toLowerCase()}`)
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent text-primary shadow-soft">
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Verify a document</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Paste the document hash printed on any CareerVault credential to confirm its authenticity,
          signatures, and on-chain anchor — no account needed.
        </p>
      </div>

      <Card className="mt-8">
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="hash" className="text-sm font-medium text-foreground">
                Document hash (SHA-256)
              </label>
              <Input
                id="hash"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="64-character hex hash"
                className="tnum font-mono"
                autoComplete="off"
                spellCheck={false}
              />
              {trimmed.length > 0 && !valid && (
                <p className="text-xs font-medium text-destructive">Enter a 64-character hexadecimal hash.</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!valid}>
              <ScanLine />
              Verify
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default VerifyHome
