import {
  canonicalizeJson,
  generateSalt,
  hashDocument,
  sha256Hex,
} from './crypto.util.js';

describe('crypto.util (R4 document hash)', () => {
  it('generateSalt returns 32 random bytes as lowercase hex', () => {
    expect(generateSalt()).toMatch(/^[0-9a-f]{64}$/);
    expect(generateSalt()).not.toBe(generateSalt());
  });

  it('hashDocument is deterministic and key-order independent (JCS)', () => {
    const salt = 'ab'.repeat(32);
    const a = hashDocument({ b: 1, a: 2 }, salt);
    const b = hashDocument({ a: 2, b: 1 }, salt);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('different salt yields a different hash', () => {
    expect(hashDocument({ x: 1 }, 'aa'.repeat(32))).not.toBe(
      hashDocument({ x: 1 }, 'bb'.repeat(32)),
    );
  });

  it('canonicalizeJson sorts object keys', () => {
    expect(canonicalizeJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('sha256Hex hashes a UTF-8 string to 64 hex chars', () => {
    expect(sha256Hex('careervault')).toMatch(/^[0-9a-f]{64}$/);
  });
});
