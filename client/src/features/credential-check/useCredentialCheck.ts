import { useRef, useState } from 'react'
import { verifyCredential } from './verifyCredential.ts'
import type { Credential, CredentialReport } from './types.ts'

export type CheckState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; report: CredentialReport; isEdited: boolean }
  | { status: 'error'; message: string }

// One verification at a time: a newer run (say, the tamper re-run) makes any older result
// stale, so a slow RPC answer from a previous file can never overwrite the current one.
export function useCredentialCheck() {
  const [state, setState] = useState<CheckState>({ status: 'idle' })
  const runId = useRef(0)

  const run = async (credential: Credential, options: { checkChain: boolean; isEdited?: boolean }) => {
    const id = ++runId.current
    setState({ status: 'running' })
    try {
      const report = await verifyCredential(credential, { checkChain: options.checkChain })
      if (id === runId.current) setState({ status: 'done', report, isEdited: Boolean(options.isEdited) })
    } catch (error) {
      // verifyCredential reports bad input as failed lines; reaching here means the browser
      // itself could not run the check (e.g. no WebCrypto outside a secure context).
      const message = error instanceof Error ? error.message : 'The check could not run in this browser.'
      if (id === runId.current) setState({ status: 'error', message })
    }
  }

  const reset = () => {
    runId.current++
    setState({ status: 'idle' })
  }

  return { state, run, reset }
}
