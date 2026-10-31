// SHA-256 (FIPS 180-4) written out one operation at a time so the lab at /demo/sha256 can show
// every intermediate value. It is a teaching copy only: CareerVault hashes documents with
// node:crypto on the server, and the lab checks this file against the browser's Web Crypto
// on every run. The padding is built as a literal string of '0'/'1' characters, so what
// the page shows is exactly what the algorithm consumes.

// First 32 bits of the fractional parts of the cube roots of the first 64 primes.
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

// First 32 bits of the fractional parts of the square roots of the first 8 primes.
const INITIAL_HASH = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]

export const REGISTER_NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

export interface ScheduleWord {
  t: number
  w: number
  // Null for t < 16, where W[t] is read straight from the block.
  sources: { w2: number; w7: number; w15: number; w16: number; sigma0: number; sigma1: number } | null
}

export interface RoundStep {
  t: number
  k: number
  w: number
  bigSigma1: number
  choose: number
  temp1: number
  bigSigma0: number
  majority: number
  temp2: number
  before: number[]
  after: number[]
}

export interface BlockTrace {
  index: number
  bits: string
  schedule: ScheduleWord[]
  rounds: RoundStep[]
  hashIn: number[]
  hashOut: number[]
}

export interface Sha256Trace {
  bytes: number[]
  messageBits: number
  zeroBits: number
  paddedBits: string
  blocks: BlockTrace[]
  digest: string
}

// `>>> 0` reinterprets JavaScript's signed 32-bit bitwise results as unsigned words.
export const rotr = (x: number, n: number) => ((x >>> n) | (x << (32 - n))) >>> 0
const add = (...words: number[]) => words.reduce((sum, word) => (sum + word) >>> 0, 0)

export const choose = (e: number, f: number, g: number) => ((e & f) ^ (~e & g)) >>> 0
export const majority = (a: number, b: number, c: number) => ((a & b) ^ (a & c) ^ (b & c)) >>> 0
export const bigSigma0 = (a: number) => (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0
export const bigSigma1 = (e: number) => (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0
export const smallSigma0 = (x: number) => (rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)) >>> 0
export const smallSigma1 = (x: number) => (rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)) >>> 0

export const toBin32 = (word: number) => (word >>> 0).toString(2).padStart(32, '0')
export const toHex32 = (word: number) => (word >>> 0).toString(16).padStart(8, '0')

function schedule(blockBits: string): ScheduleWord[] {
  const words: ScheduleWord[] = []
  for (let t = 0; t < 16; t++) {
    words.push({ t, w: parseInt(blockBits.slice(t * 32, t * 32 + 32), 2) >>> 0, sources: null })
  }
  for (let t = 16; t < 64; t++) {
    const [w2, w7, w15, w16] = [words[t - 2].w, words[t - 7].w, words[t - 15].w, words[t - 16].w]
    const sigma0 = smallSigma0(w15)
    const sigma1 = smallSigma1(w2)
    words.push({ t, w: add(sigma1, w7, sigma0, w16), sources: { w2, w7, w15, w16, sigma0, sigma1 } })
  }
  return words
}

function compress(words: ScheduleWord[], hashIn: number[]): RoundStep[] {
  const rounds: RoundStep[] = []
  let registers = [...hashIn]
  for (let t = 0; t < 64; t++) {
    const [a, b, c, d, e, f, g, h] = registers
    const step = { bigSigma1: bigSigma1(e), choose: choose(e, f, g), bigSigma0: bigSigma0(a), majority: majority(a, b, c) }
    const temp1 = add(h, step.bigSigma1, step.choose, K[t], words[t].w)
    const temp2 = add(step.bigSigma0, step.majority)
    const after = [add(temp1, temp2), a, b, c, add(d, temp1), e, f, g]
    rounds.push({ t, k: K[t], w: words[t].w, ...step, temp1, temp2, before: registers, after })
    registers = after
  }
  return rounds
}

export function sha256Trace(input: string): Sha256Trace {
  const bytes = Array.from(new TextEncoder().encode(input))
  const message = bytes.map((byte) => byte.toString(2).padStart(8, '0')).join('')
  // Append one '1' bit, then enough zeros that the length field ends the last 512-bit block.
  const zeroBits = (448 - ((message.length + 1) % 512) + 512) % 512
  const paddedBits = message + '1' + '0'.repeat(zeroBits) + message.length.toString(2).padStart(64, '0')

  const blocks: BlockTrace[] = []
  let hash = INITIAL_HASH
  for (let index = 0; index < paddedBits.length / 512; index++) {
    const bits = paddedBits.slice(index * 512, index * 512 + 512)
    const words = schedule(bits)
    const rounds = compress(words, hash)
    const hashOut = hash.map((word, i) => add(word, rounds[63].after[i]))
    blocks.push({ index, bits, schedule: words, rounds, hashIn: hash, hashOut })
    hash = hashOut
  }

  return { bytes, messageBits: message.length, zeroBits, paddedBits, blocks, digest: hash.map(toHex32).join('') }
}
