import { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/shared/PageHeader'
import { Section } from '@/components/shared/Section'
import { DigestPanel } from '@/features/sha256-lab/components/DigestPanel'
import { PaddingView } from '@/features/sha256-lab/components/PaddingView'
import { RoundInspector } from '@/features/sha256-lab/components/RoundInspector'
import { ScheduleTable } from '@/features/sha256-lab/components/ScheduleTable'
import { sha256Trace } from '@/features/sha256-lab/sha256Trace'
import { useWebCryptoDigest } from '@/features/sha256-lab/useWebCryptoDigest'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cn } from '@/lib/utils'

// Long enough to force a second block (56+ bytes), short enough that every bit stays readable.
const MAX_LENGTH = 64

// The SHA-256 lab: type a short message and follow it through padding, the message schedule
// and all 64 compression rounds, computed by our own zero-library implementation.
const Sha256Visualizer = () => {
  useDocumentTitle('SHA-256 lab')
  const [input, setInput] = useState('abc')
  const [blockIndex, setBlockIndex] = useState(0)
  const [round, setRound] = useState(0)
  const trace = useMemo(() => sha256Trace(input), [input])
  const webCryptoDigest = useWebCryptoDigest(input)
  // Shortening the message can remove the block that was selected.
  const block = trace.blocks[Math.min(blockIndex, trace.blocks.length - 1)]

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 lg:px-8">
      <PageHeader
        eyebrow="Demo · Cryptography lab"
        title="SHA-256, one bit at a time"
        description="Our own SHA-256, written from FIPS 180-4 with no library, traced step by step: padding, the 64-word message schedule and every compression round. The result is checked against the browser’s built-in SHA-256."
      />

      <Card className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sha-input">Message</Label>
          <Input
            id="sha-input"
            value={input}
            maxLength={MAX_LENGTH}
            onChange={(event) => setInput(event.target.value)}
            className="tnum max-w-md font-mono"
            autoComplete="off"
            spellCheck={false}
            aria-describedby="sha-input-hint"
          />
          <p id="sha-input-hint" className="tnum text-label text-muted-foreground">
            {trace.bytes.length} UTF-8 bytes · {trace.messageBits} bits · {trace.blocks.length} block
            {trace.blocks.length > 1 ? 's' : ''}. Up to {MAX_LENGTH} characters; 56 or more bytes need a second block.
          </p>
        </div>
        {trace.blocks.length > 1 && (
          <div role="group" aria-label="Block" className="flex w-fit gap-1 rounded-lg bg-surface-2 p-1">
            {trace.blocks.map((candidate) => (
              <button
                key={candidate.index}
                type="button"
                aria-pressed={candidate.index === block.index}
                onClick={() => setBlockIndex(candidate.index)}
                className={cn(
                  'focus-ring cursor-pointer rounded-md px-3 py-1.5 text-label font-medium transition-colors',
                  candidate.index === block.index ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Block {candidate.index + 1}
              </button>
            ))}
          </div>
        )}
      </Card>

      <Section title="1 · Padding and parsing" description="The message becomes bits, is padded to a multiple of 512, and each block is read as sixteen 32-bit words.">
        <Card className="p-6">
          <PaddingView trace={trace} block={block} />
        </Card>
      </Section>

      <Section title="2 · Message schedule W₀ … W₆₃" description="Words 16 to 63 are built from earlier words with the σ0 and σ1 rotate-and-XOR functions.">
        <Card className="p-6">
          <ScheduleTable block={block} />
        </Card>
      </Section>

      <Section title="3 · Compression, 64 rounds" description="Each round computes T1 and T2 from the eight working registers, then shifts the registers down.">
        <Card className="p-6">
          <RoundInspector block={block} round={round} onRoundChange={setRound} />
        </Card>
      </Section>

      <Section title="4 · Digest" description="Add the final registers to the starting hash; the last block’s eight words are the digest.">
        <Card className="p-6">
          <DigestPanel
            block={block}
            digest={trace.digest}
            webCryptoDigest={webCryptoDigest}
            isLastBlock={block.index === trace.blocks.length - 1}
          />
        </Card>
      </Section>
    </div>
  )
}

export default Sha256Visualizer
