import { useCallback, useEffect, useState } from 'react'
import { blockNumber, formatPol, getBalance, getCode, lastRpcUsed } from '@/features/credential-check/amoyRpc'
import { isAuthorizedAnchor } from '@/features/credential-check/anchorRegistry'

// Below this the server's own self-check warns too (anchor-self-check.ts LOW_BALANCE).
const LOW_BALANCE_WEI = 5n * 10n ** 16n

export interface PreflightResult {
  block: number
  rpc: string | null
  codeBytes: number
  isAuthorized: boolean
  balance: string
  isBalanceLow: boolean
}

export type PreflightState =
  | { status: 'running' }
  | { status: 'done'; result: PreflightResult }
  | { status: 'error'; message: string }

// The demo's T−60 pre-flight, read straight from Polygon by the browser: is the registry
// deployed, may our wallet anchor, and can it pay for gas. No server log needed.
export function useChainPreflight(contract: string, wallet: string) {
  const [state, setState] = useState<PreflightState>({ status: 'running' })

  const run = useCallback(async () => {
    setState({ status: 'running' })
    try {
      const [block, code, isAuthorized, balance] = await Promise.all([
        blockNumber(),
        getCode(contract),
        isAuthorizedAnchor(contract, wallet),
        getBalance(wallet),
      ])
      setState({
        status: 'done',
        result: {
          block,
          rpc: lastRpcUsed(),
          codeBytes: Math.max(0, (code.length - 2) / 2),
          isAuthorized,
          balance: formatPol(balance),
          isBalanceLow: balance < LOW_BALANCE_WEI,
        },
      })
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'No RPC endpoint answered.' })
    }
  }, [contract, wallet])

  // External chain state, not app data: read once when the guide opens, then on demand.
  useEffect(() => {
    void run()
  }, [run])

  return { state, run }
}
