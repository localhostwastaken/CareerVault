import {
  canonicalizeJson,
  generateSalt,
  hashDocument,
  normalizeSubject,
  sha256Hex,
  signingStatementHash,
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

describe('signingStatementHash (C1 dual-signature)', () => {
  const hash = 'f'.repeat(64);

  // The whole point of the scheme: signing the bare hash twice with one org key under
  // deterministic RSA padding produced two IDENTICAL signatures, so "dual signature"
  // proved nothing. Distinct statements make the two co-signatures distinct.
  it('produces a DIFFERENT statement per role for the same document', () => {
    expect(signingStatementHash(hash, 'MANAGER', 'member-1')).not.toBe(
      signingStatementHash(hash, 'HR', 'member-1'),
    );
  });

  it('binds the signing member, so two members never share a statement', () => {
    expect(signingStatementHash(hash, 'HR', 'member-1')).not.toBe(
      signingStatementHash(hash, 'HR', 'member-2'),
    );
  });

  it('binds the document, so a signature cannot be replayed onto another document', () => {
    expect(signingStatementHash(hash, 'MANAGER', 'm')).not.toBe(
      signingStatementHash('a'.repeat(64), 'MANAGER', 'm'),
    );
  });

  it('is deterministic so verification can recompute it', () => {
    expect(signingStatementHash(hash, 'MANAGER', 'm')).toBe(
      signingStatementHash(hash, 'MANAGER', 'm'),
    );
    expect(signingStatementHash(hash, 'MANAGER', 'm')).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });
});

describe('normalizeSubject (deterministic signed bytes)', () => {
  it('drops null/undefined/empty values that would change the canonical form', () => {
    expect(
      normalizeSubject({
        kept: 'x',
        empty: '',
        nothing: null,
        missing: undefined,
        emptyList: [],
        emptyObject: {},
      }),
    ).toEqual({ kept: 'x' });
  });

  it('preserves meaningful falsy values', () => {
    expect(normalizeSubject({ zero: 0, no: false })).toEqual({
      zero: 0,
      no: false,
    });
  });

  it('makes an omitted key and an empty key hash identically', () => {
    const salt = 'cd'.repeat(32);
    expect(hashDocument(normalizeSubject({ a: 1, b: null }), salt)).toBe(
      hashDocument(normalizeSubject({ a: 1 }), salt),
    );
  });

  it('recurses into nested objects and arrays', () => {
    expect(
      normalizeSubject({ list: [{ a: 1, b: '' }], nested: { c: null, d: 2 } }),
    ).toEqual({ list: [{ a: 1 }], nested: { d: 2 } });
  });
});
