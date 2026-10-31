import { CircleAlert, CircleCheck } from 'lucide-react'
import { toHex32, type BlockTrace } from '@/features/sha256-lab/sha256Trace'

interface DigestPanelProps {
  block: BlockTrace
  digest: string
  /** Null while the browser's digest is still computing. */
  webCryptoDigest: string | null
  isLastBlock: boolean
}

// The block's output is the hash it started from plus the final registers, word by word. The
// last block's output, concatenated, is the digest.
export function DigestPanel({ block, digest, webCryptoDigest, isLastBlock }: DigestPanelProps) {
  const final = block.rounds[63].after
  const isMatch = webCryptoDigest === digest

  return (
    <div className="flex flex-col gap-4">
      <div className="inset-well overflow-x-auto p-3">
        <table className="tnum font-mono text-label">
          <caption className="mb-2 text-left font-sans text-label text-muted-foreground">
            Hᵢ(out) = Hᵢ(in) + register after round 63, modulo 2³²
          </caption>
          <tbody>
            {block.hashOut.map((word, index) => (
              <tr key={index}>
                <th scope="row" className="py-0.5 pr-3 text-left font-sans font-medium text-muted-foreground">
                  H{index}
                </th>
                <td className="py-0.5 pr-2 text-muted-foreground">{toHex32(block.hashIn[index])}</td>
                <td className="py-0.5 pr-2 text-subtle">+</td>
                <td className="py-0.5 pr-2 text-muted-foreground">{toHex32(final[index])}</td>
                <td className="py-0.5 pr-2 text-subtle">=</td>
                <td className="py-0.5 font-semibold text-foreground">{toHex32(word)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isLastBlock ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <p className="label-micro">Digest (H0 ‖ H1 ‖ … ‖ H7)</p>
            <p className="tnum break-all font-mono text-body-lg text-foreground">{digest}</p>
          </div>
          {webCryptoDigest && (
            <p className={isMatch ? 'flex items-start gap-1.5 text-label text-verified' : 'flex items-start gap-1.5 text-label text-revoked'}>
              {isMatch ? <CircleCheck className="mt-px size-4 shrink-0" /> : <CircleAlert className="mt-px size-4 shrink-0" />}
              {isMatch
                ? 'Matches the browser’s built-in Web Crypto SHA-256, computed independently.'
                : `Does not match Web Crypto (${webCryptoDigest}).`}
            </p>
          )}
        </div>
      ) : (
        <p className="text-body text-muted-foreground">
          This block’s output becomes the starting hash for block {block.index + 2}.
        </p>
      )}
    </div>
  )
}
