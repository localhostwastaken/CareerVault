import { useEffect, useState } from 'react'

// The browser's own SHA-256, as an independent check on the hand-written one. It is async, so
// it settles one render after the trace; a stale result for earlier input is never returned.
export function useWebCryptoDigest(input: string): string | null {
  const [result, setResult] = useState<{ input: string; digest: string } | null>(null)

  useEffect(() => {
    let isCurrent = true
    void crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)).then((buffer) => {
      if (!isCurrent) return
      const digest = Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
      setResult({ input, digest })
    })
    return () => {
      isCurrent = false
    }
  }, [input])

  return result?.input === input ? result.digest : null
}
