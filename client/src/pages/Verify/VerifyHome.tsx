import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanLine, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

const HASH_RE = /^[0-9a-f]{64}$/i
const TOKEN_RE = /^[0-9a-f]{48}$/i

const VerifyHome = () => {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [mode, setMode] = useState<'hash' | 'token'>('token')
  const trimmed = value.trim()

  const hashValid = HASH_RE.test(trimmed)
  const tokenValid = TOKEN_RE.test(trimmed)
  const valid = mode === 'hash' ? hashValid : tokenValid

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    if (mode === 'hash') navigate(`/verify/hash/${trimmed.toLowerCase()}`)
    else navigate(`/verify/${trimmed}`)
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent text-primary shadow-soft">
          <ShieldCheck className="size-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Verify a document</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Paste a share link token or document hash to confirm authenticity, signatures, and on-chain anchor — no account needed.
        </p>
      </div>

      <Card className="mt-8">
        <CardContent className="pt-6">
          <div className="mb-4 flex rounded-lg border border-border bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => { setMode('token'); setValue('') }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'token' ? 'bg-surface text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Share link
            </button>
            <button
              type="button"
              onClick={() => { setMode('hash'); setValue('') }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${mode === 'hash' ? 'bg-surface text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Document hash
            </button>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="input" className="text-sm font-medium text-foreground">
                {mode === 'token' ? 'Share link token' : 'Document hash (SHA-256)'}
              </label>
              <Input
                id="input"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={mode === 'token' ? '48-character hex token' : '64-character hex hash'}
                className="tnum font-mono"
                autoComplete="off"
                spellCheck={false}
              />
              {trimmed.length > 0 && !valid && (
                <p className="text-xs font-medium text-destructive">
                  Enter a {mode === 'token' ? '48' : '64'}-character hexadecimal {mode === 'token' ? 'token' : 'hash'}.
                </p>
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
