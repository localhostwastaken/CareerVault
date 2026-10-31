import { BitRows } from '@/features/sha256-lab/components/BitRows'
import { sigmaParts, type SigmaName } from '@/features/sha256-lab/sigmaParts'

interface SigmaBreakdownProps {
  name: SigmaName
  /** What the input word is called at this point, e.g. "W₁" or "e". */
  inputLabel: string
  input: number
  result: number
}

// One σ/Σ function at the bit level: the input, its three shifted copies, and their XOR.
export function SigmaBreakdown({ name, inputLabel, input, result }: SigmaBreakdownProps) {
  const parts = sigmaParts(name, input)
  return (
    <BitRows
      caption={`${name}(${inputLabel}) = ${parts.map((part) => `${part.label}(${inputLabel})`).join(' ⊕ ')}`}
      rows={[
        { label: inputLabel, word: input },
        ...parts.map((part, index) => ({ ...part, label: `${part.label}(${inputLabel})`, operator: index ? '⊕' : undefined })),
        { label: `${name}(${inputLabel})`, word: result, operator: '=', isResult: true },
      ]}
    />
  )
}
