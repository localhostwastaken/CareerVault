import {
  unwrapEmployeeKey,
  wrapEmployeeKey,
  type EmployeeKeyContext,
} from './employee-key-wrap.js';

const MASTER = Buffer.alloc(32, 1);
const KEY = Buffer.alloc(32, 9);
const CTX: EmployeeKeyContext = {
  organizationId: 'org-1',
  userId: 'user-1',
  version: 1,
};

describe('employee key wrapping (AES-256-GCM under the org employee KEK)', () => {
  it('round-trips the key and never stores it in the clear', () => {
    const wrapped = wrapEmployeeKey(MASTER, KEY, CTX);
    expect(wrapped).toMatch(/^ekw1:[\w-]+:[\w-]+:[\w-]+$/);
    expect(wrapped).not.toContain(KEY.toString('base64url'));
    expect(unwrapEmployeeKey(MASTER, wrapped, CTX)).toEqual(KEY);
  });

  it('uses a fresh IV, so wrapping the same key twice gives different ciphertext', () => {
    expect(wrapEmployeeKey(MASTER, KEY, CTX)).not.toBe(
      wrapEmployeeKey(MASTER, KEY, CTX),
    );
  });

  it('is bound to its row: another user, org or version cannot open it', () => {
    const wrapped = wrapEmployeeKey(MASTER, KEY, CTX);
    for (const other of [
      { ...CTX, userId: 'user-2' },
      { ...CTX, organizationId: 'org-2' },
      { ...CTX, version: 2 },
    ]) {
      expect(() => unwrapEmployeeKey(MASTER, wrapped, other)).toThrow();
    }
  });

  it('cannot be opened under another master key', () => {
    const wrapped = wrapEmployeeKey(MASTER, KEY, CTX);
    expect(() =>
      unwrapEmployeeKey(Buffer.alloc(32, 2), wrapped, CTX),
    ).toThrow();
  });

  it('rejects an edited ciphertext (GCM authentication)', () => {
    const [prefix, iv, body, tag] = wrapEmployeeKey(MASTER, KEY, CTX).split(
      ':',
    );
    const flipped = Buffer.from(body, 'base64url');
    flipped[0] ^= 1;
    expect(() =>
      unwrapEmployeeKey(
        MASTER,
        [prefix, iv, flipped.toString('base64url'), tag].join(':'),
        CTX,
      ),
    ).toThrow();
  });

  it('rejects anything that is not an ekw1 envelope', () => {
    expect(() => unwrapEmployeeKey(MASTER, 'plaintext', CTX)).toThrow(
      /envelope/,
    );
  });
});
