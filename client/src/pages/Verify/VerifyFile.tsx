import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileCheck2, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Explainer } from '@/components/shared/Explainer'
import { Notice } from '@/components/shared/Notice'
import { CredentialDropzone } from '@/features/credential-check/components/CredentialDropzone'
import { CredentialReportView } from '@/features/credential-check/components/CredentialReportView'
import { TamperPanel } from '@/features/credential-check/components/TamperPanel'
import { parseCredential } from '@/features/credential-check/parseCredential'
import type { Credential } from '@/features/credential-check/types'
import { useCredentialCheck } from '@/features/credential-check/useCredentialCheck'
import { PROOF_FILE_STEPS } from '@/features/document/explainers'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// The offline verifier, in the browser: a holder's downloaded proof file is checked here
// with no CareerVault API involved, so the demo's "verify without trusting us" step needs
// no terminal. The same checks, labels and verdicts as tools/verify-credential.
const VerifyFile = () => {
  useDocumentTitle('Check a proof file')
  const { state, run, reset } = useCredentialCheck()
  const [credential, setCredential] = useState<Credential | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [checkChain, setCheckChain] = useState(true)

  const onFile = async (file: File) => {
    const parsed = parseCredential(await file.text())
    setFileName(file.name)
    if (!parsed.ok) {
      setCredential(null)
      setParseError(parsed.error)
      reset()
      return
    }
    setParseError(null)
    setCredential(parsed.credential)
    void run(parsed.credential, { checkChain })
  }

  const startOver = () => {
    setCredential(null)
    setFileName(null)
    setParseError(null)
    reset()
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 lg:px-8">
      <Button asChild variant="ghost" size="sm" className="no-print -ml-2 self-start">
        <Link to="/verify">
          <ArrowLeft />
          Verify by link or hash instead
        </Link>
      </Button>

      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="label-micro mb-1.5">Offline verification</p>
          <h1 className="font-serif text-h1 text-foreground">Check a proof file</h1>
          <p className="mt-1.5 max-w-2xl text-body text-muted-foreground">
            Recompute the hash, both signatures and the Merkle proof from the file alone, then ask Polygon whether the root
            exists. Nothing is sent to CareerVault.
          </p>
        </div>
        {credential && (
          <Button variant="outline" onClick={startOver} className="shrink-0">
            <RotateCcw />
            Check another file
          </Button>
        )}
      </div>

      {!credential && (
        <div className="flex flex-col gap-4">
          <CredentialDropzone onFile={onFile} />
          <label className="flex items-start gap-2 text-label text-muted-foreground">
            <Checkbox checked={checkChain} onChange={(event) => setCheckChain(event.target.checked)} className="mt-0.5" />
            <span>
              Also confirm the anchor on Polygon Amoy (reads public RPC nodes). Untick to check the file fully offline.
            </span>
          </label>
          {parseError && (
            <Notice tone="revoked" title={`Couldn't read ${fileName ?? 'that file'}`}>
              {parseError}
            </Notice>
          )}
        </div>
      )}

      {state.status === 'error' && (
        <Notice tone="revoked" title="The check could not run in this browser">
          {state.message}
        </Notice>
      )}

      {credential && (state.status === 'running' || state.status === 'done') && (
        <>
          <p className="flex items-center gap-2 text-label text-muted-foreground">
            <FileCheck2 className="size-4 text-seal" aria-hidden />
            <span className="tnum font-mono">{fileName}</span>
          </p>
          {state.status === 'running' ? (
            <Card role="status" className="flex items-center gap-3 p-6">
              <Loader2 className="size-5 animate-spin text-seal" aria-hidden />
              <p className="text-body text-foreground">
                Running the checks{checkChain ? ', including the on-chain anchor…' : ' offline…'}
              </p>
            </Card>
          ) : (
            <CredentialReportView report={state.report} isEdited={state.isEdited} />
          )}
          {/* Stays mounted across re-runs so the visitor's edit survives the next check. */}
          <TamperPanel
            credential={credential}
            isRunning={state.status === 'running'}
            onRun={(edited) => void run(edited, { checkChain, isEdited: edited !== credential })}
          />
        </>
      )}

      <Explainer title="How the proof file is checked" summary="Four steps, none of which involve CareerVault." steps={PROOF_FILE_STEPS} />
    </div>
  )
}

export default VerifyFile
