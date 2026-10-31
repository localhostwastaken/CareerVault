import { rotr } from './sha256Trace'

export type SigmaName = 'σ0' | 'σ1' | 'Σ0' | 'Σ1'

// FIPS 180-4 §4.1.2. The lowercase σ functions expand the message schedule and end in a plain
// right shift; the uppercase Σ functions mix the working registers and only rotate.
const SHIFTS: Record<SigmaName, Array<['ROTR' | 'SHR', number]>> = {
  'σ0': [['ROTR', 7], ['ROTR', 18], ['SHR', 3]],
  'σ1': [['ROTR', 17], ['ROTR', 19], ['SHR', 10]],
  'Σ0': [['ROTR', 2], ['ROTR', 13], ['ROTR', 22]],
  'Σ1': [['ROTR', 6], ['ROTR', 11], ['ROTR', 25]],
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const sup = (n: number) => String(n).replace(/\d/g, (digit) => SUPERSCRIPT[Number(digit)])

export interface SigmaPart {
  label: string
  word: number
}

/** The three shifted copies of `x` that are XORed together into the named function's output. */
export function sigmaParts(name: SigmaName, x: number): SigmaPart[] {
  return SHIFTS[name].map(([op, n]) => ({
    label: `${op}${sup(n)}`,
    word: op === 'ROTR' ? rotr(x, n) : x >>> n,
  }))
}
