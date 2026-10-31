import {
  documentBytes,
  type SigningStatement,
} from '../crypto/document-bytes.js';
import {
  employeeSeal,
  generateSalt,
  hashDocument,
  normalizeSubject,
  sealsMatch,
  sha256Hex,
  signingStatementHash,
} from './crypto.util.js';

const IDENTITY = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'SALARY_PROOF',
  organizationId: '22222222-2222-4222-8222-222222222222',
  holderId: '33333333-3333-4333-8333-333333333333',
};
const SALT = 'ab'.repeat(32);
const KEY = Buffer.alloc(32, 7);

describe('crypto.util (R4 document hash)', () => {
  it('generateSalt returns 32 random bytes as lowercase hex', () => {
    expect(generateSalt()).toMatch(/^[0-9a-f]{64}$/);
    expect(generateSalt()).not.toBe(generateSalt());
  });

  it('hashDocument is deterministic and key-order independent', () => {
    const a = hashDocument(IDENTITY, { b: 1, a: 2 }, SALT);
    expect(a).toBe(hashDocument(IDENTITY, { a: 2, b: 1 }, SALT));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it('a different salt yields a different hash', () => {
    expect(hashDocument(IDENTITY, { x: 1 }, 'aa'.repeat(32))).not.toBe(
      hashDocument(IDENTITY, { x: 1 }, 'bb'.repeat(32)),
    );
  });

  it('moving a document to another holder changes its hash', () => {
    expect(hashDocument(IDENTITY, { x: 1 }, SALT)).not.toBe(
      hashDocument({ ...IDENTITY, holderId: IDENTITY.id }, { x: 1 }, SALT),
    );
  });

  it('sha256Hex hashes a UTF-8 string to 64 hex chars', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('employeeSeal (per-signer HMAC)', () => {
  const bytes = documentBytes(IDENTITY, { basicPaise: 5000000 }, SALT);

  it('is an HMAC-SHA256: same key and bytes, same seal', () => {
    expect(employeeSeal(KEY, bytes)).toBe(employeeSeal(KEY, bytes));
    expect(employeeSeal(KEY, bytes)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when one paisa of the content changes', () => {
    const edited = documentBytes(IDENTITY, { basicPaise: 5000001 }, SALT);
    expect(employeeSeal(KEY, edited)).not.toBe(employeeSeal(KEY, bytes));
  });

  it('cannot be produced without the employee key', () => {
    expect(employeeSeal(Buffer.alloc(32, 8), bytes)).not.toBe(
      employeeSeal(KEY, bytes),
    );
  });

  it('sealsMatch compares in constant time and rejects anything malformed', () => {
    const seal = employeeSeal(KEY, bytes);
    expect(sealsMatch(seal, seal)).toBe(true);
    expect(sealsMatch(seal, '00'.repeat(32))).toBe(false);
    expect(sealsMatch(seal, 'zz')).toBe(false);
    expect(sealsMatch('', '')).toBe(false);
  });
});

describe('signingStatementHash (C1 dual-signature)', () => {
  const statement: SigningStatement = {
    documentHash: 'f'.repeat(64),
    seal: 'e'.repeat(64),
    role: 'MANAGER',
    memberId: 'member-1',
    employeeKeyId: 'key-1',
  };
  const hashOf = (overrides: Partial<SigningStatement>) =>
    signingStatementHash({ ...statement, ...overrides });

  // Signing the bare hash twice with one org key under deterministic RSA padding produced
  // two IDENTICAL signatures, so "dual signature" proved nothing.
  it('produces a different statement per role for the same document', () => {
    expect(hashOf({})).not.toBe(hashOf({ role: 'HR' }));
  });

  it('binds the member, the seal and the employee key', () => {
    expect(hashOf({})).not.toBe(hashOf({ memberId: 'member-2' }));
    expect(hashOf({})).not.toBe(hashOf({ seal: 'd'.repeat(64) }));
    expect(hashOf({})).not.toBe(hashOf({ employeeKeyId: 'key-2' }));
  });

  it('binds the document, so a signature cannot be replayed onto another one', () => {
    expect(hashOf({})).not.toBe(hashOf({ documentHash: 'a'.repeat(64) }));
  });

  it('is deterministic so verification can recompute it', () => {
    expect(hashOf({})).toBe(hashOf({}));
    expect(hashOf({})).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('normalizeSubject (deterministic signed bytes)', () => {
  it('drops null/undefined/empty values that would change the serialized bytes', () => {
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
    expect(
      hashDocument(IDENTITY, normalizeSubject({ a: 1, b: null }), SALT),
    ).toBe(hashDocument(IDENTITY, normalizeSubject({ a: 1 }), SALT));
  });

  it('recurses into nested objects and arrays', () => {
    expect(
      normalizeSubject({ list: [{ a: 1, b: '' }], nested: { c: null, d: 2 } }),
    ).toEqual({ list: [{ a: 1 }], nested: { d: 2 } });
  });
});
