import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Notice } from '@/components/shared/Notice'
import { useChainPreflight, type PreflightResult } from '@/features/demo/useChainPreflight'

function Check({ kind, label, children }: { kind: 'pass' | 'warn' | 'fail'; label: string; children: ReactNode }) {
  const Icon = kind === 'pass' ? CheckCircle2 : kind === 'warn' ? AlertTriangle : XCircle
  const color = kind === 'pass' ? 'text-verified' : kind === 'warn' ? 'text-pending' : 'text-revoked'
  return (
    <li className="flex items-start gap-2 border-b border-border py-2.5 last:border-b-0">
      <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-hidden />
      <div className="min-w-0">
        <p className="text-label font-semibold text-foreground">{label}</p>
        <p className="tnum text-label text-muted-foreground">{children}</p>
      </div>
    </li>
  )
}

function Results({ result }: { result: PreflightResult }) {
  return (
    <ul>
      <Check kind="pass" label="Polygon Amoy reachable">
        Latest block #{result.block}
        {result.rpc ? ` via ${result.rpc}` : ''}
      </Check>
      <Check kind={result.codeBytes > 0 ? 'pass' : 'fail'} label="Registry contract deployed">
        {result.codeBytes > 0 ? `${result.codeBytes.toLocaleString()} bytes of contract code` : 'No code at this address'}
      </Check>
      <Check kind={result.isAuthorized ? 'pass' : 'fail'} label="Anchor wallet authorised">
        {result.isAuthorized ? 'isAuthorizedAnchor(wallet) = true' : 'The registry will reject this wallet’s anchors'}
      </Check>
      <Check kind={result.isBalanceLow ? 'warn' : 'pass'} label="Gas balance">
        {result.balance} POL{result.isBalanceLow ? ': below 0.05, fund it from a faucet before anchoring' : ''}
      </Check>
    </ul>
  )
}

export function ChainPreflight({ contract, wallet }: { contract: string; wallet: string }) {
  const { state, run } = useChainPreflight(contract, wallet)

  return (
    <Card className="flex flex-col gap-3 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-h2 text-foreground">Chain pre-flight</h2>
          <p className="mt-0.5 text-body text-muted-foreground">
            Read live from Polygon by this browser, before you click &ldquo;Anchor now&rdquo; in front of anyone.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void run()} disabled={state.status === 'running'}>
          {state.status === 'running' ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Re-check
        </Button>
      </div>
      {state.status === 'running' && <p role="status" className="text-label text-muted-foreground">Reading the chain…</p>}
      {state.status === 'error' && (
        <Notice tone="pending" title="Couldn't reach a public Amoy RPC">
          {state.message} Anchoring uses the server&rsquo;s own RPC, so this alone doesn&rsquo;t mean it is down.
        </Notice>
      )}
      {state.status === 'done' && <Results result={state.result} />}
    </Card>
  )
}
