import { createHash } from 'node:crypto';
import {
  documentBytes,
  encodeValue,
  statementBytes,
} from './document-bytes.js';

const IDENTITY = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'EXPERIENCE_LETTER',
  organizationId: '22222222-2222-4222-8222-222222222222',
  holderId: '33333333-3333-4333-8333-333333333333',
};
const SALT = 'ab'.repeat(32);

describe('encodeValue (TLV, R4)', () => {
  it('encodes a string as tag 0x01, a big-endian u32 byte length, then UTF-8', () => {
    expect(encodeValue('hé').toString('hex')).toBe('0100000003' + '68c3a9');
  });

  it('encodes an integer as tag 0x02 and a signed 64-bit big-endian value', () => {
    expect(encodeValue(-1).toString('hex')).toBe('02ffffffffffffffff');
    expect(encodeValue(5000000).toString('hex')).toBe('0200000000004c4b40');
  });

  it('encodes booleans, arrays and objects with their own tags and counts', () => {
    expect(encodeValue(true).toString('hex')).toBe('0301');
    expect(encodeValue([false]).toString('hex')).toBe('0400000001' + '0300');
    expect(encodeValue({ a: true }).toString('hex')).toBe(
      '0500000001' + '0100000001' + '61' + '0301',
    );
  });

  it('is independent of key insertion order', () => {
    expect(encodeValue({ b: 1, a: { d: 2, c: 3 } })).toEqual(
      encodeValue({ a: { c: 3, d: 2 }, b: 1 }),
    );
  });

  it('length-prefixes, so moving a character across a field boundary changes the bytes', () => {
    expect(encodeValue({ a: 'ab', b: 'c' })).not.toEqual(
      encodeValue({ a: 'a', b: 'bc' }),
    );
  });

  it('keeps types apart: the number 1 and the string "1" never collide', () => {
    expect(encodeValue(1)).not.toEqual(encodeValue('1'));
  });

  it('rejects values the format cannot represent exactly', () => {
    expect(() => encodeValue(1.5)).toThrow(/integer/);
    expect(() => encodeValue(null)).toThrow(/null/);
    expect(() => encodeValue(undefined)).toThrow(/undefined/);
    expect(() => encodeValue(2 ** 53)).toThrow(/integer/);
  });
});

describe('documentBytes', () => {
  it('starts with the CVDOC magic and version 2, and ends with the 32 raw salt bytes', () => {
    const bytes = documentBytes(IDENTITY, { name: 'Jane' }, SALT);
    expect(bytes.subarray(0, 6).toString('hex')).toBe('4356444f4302');
    expect(bytes.subarray(-32).toString('hex')).toBe(SALT);
  });

  it('binds the document identity: a different holder gives different bytes', () => {
    const other = {
      ...IDENTITY,
      holderId: '44444444-4444-4444-8444-444444444444',
    };
    expect(documentBytes(IDENTITY, { name: 'Jane' }, SALT)).not.toEqual(
      documentBytes(other, { name: 'Jane' }, SALT),
    );
  });

  it('rejects a salt that is not exactly 32 bytes of hex', () => {
    expect(() => documentBytes(IDENTITY, {}, 'ab')).toThrow(/salt/);
  });

  it('is pinned to a known answer so a format change cannot slip through', () => {
    const bytes = documentBytes(IDENTITY, { name: 'Jane', years: 3 }, SALT);
    // 6 header + 4 identity strings (41+22+41+41) + subject (42) + salt (32)
    expect(bytes).toHaveLength(225);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      '9dc984c0d8af57548cfbf3b5a04d2dfcb0b004f79e71d4152ac7f904b07e79c6',
    );
  });
});

describe('statementBytes', () => {
  it('starts with the CVSTM magic and version 2 and covers every field', () => {
    const base = {
      documentHash: 'cd'.repeat(32),
      seal: 'ef'.repeat(32),
      role: 'MANAGER' as const,
      memberId: IDENTITY.organizationId,
      employeeKeyId: IDENTITY.holderId,
    };
    const bytes = statementBytes(base);
    expect(bytes.subarray(0, 6).toString('hex')).toBe('435653544d02');
    expect(statementBytes({ ...base, role: 'HR' })).not.toEqual(bytes);
    expect(statementBytes({ ...base, seal: '00'.repeat(32) })).not.toEqual(
      bytes,
    );
  });
});
