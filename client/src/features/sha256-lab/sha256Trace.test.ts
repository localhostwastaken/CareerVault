import { describe, expect, it } from 'vitest'
import { sha256Trace, toBin32, toHex32 } from './sha256Trace'

// FIPS 180-4 / NIST CAVP known answers. If any of these drift, the visualizer is showing a
// trace of something that is not SHA-256.
const VECTORS: Array<[string, string]> = [
  ['abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
  ['', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
  [
    'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq',
    '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
  ],
]

describe('sha256Trace', () => {
  it.each(VECTORS)('hashes %j to the NIST digest', (input, digest) => {
    expect(sha256Trace(input).digest).toBe(digest)
  })

  it('pads "abc" to one 512-bit block: message, a single 1 bit, zeros, 64-bit length', () => {
    const trace = sha256Trace('abc')
    expect(trace.messageBits).toBe(24)
    expect(trace.zeroBits).toBe(423)
    expect(trace.paddedBits).toHaveLength(512)
    expect(trace.paddedBits[24]).toBe('1')
    expect(parseInt(trace.paddedBits.slice(448), 2)).toBe(24)
    expect(trace.blocks).toHaveLength(1)
  })

  it('splits the 448-bit vector into two blocks because the length field no longer fits', () => {
    expect(sha256Trace(VECTORS[2][0]).blocks).toHaveLength(2)
  })

  it('exposes 64 schedule words and 64 rounds per block, starting from the message words', () => {
    const [block] = sha256Trace('abc').blocks
    expect(block.schedule).toHaveLength(64)
    expect(block.rounds).toHaveLength(64)
    expect(toHex32(block.schedule[0].w)).toBe('61626380')
    expect(block.schedule[15].w).toBe(24)
    expect(block.schedule[16].sources).toBeDefined()
  })

  it('records round 0 of "abc" exactly as FIPS 180-4 Appendix B.1 lists it', () => {
    const [round0] = sha256Trace('abc').blocks[0].rounds
    expect(round0.after.map(toHex32)).toEqual([
      '5d6aebcd', '6a09e667', 'bb67ae85', '3c6ef372', 'fa2a4622', '510e527f', '9b05688c', '1f83d9ab',
    ])
  })

  it('formats words as 32-bit binary and hex with leading zeros', () => {
    expect(toBin32(5)).toBe('00000000000000000000000000000101')
    expect(toHex32(0xff)).toBe('000000ff')
  })
})
