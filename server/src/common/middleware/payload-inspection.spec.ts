import { findViolation } from './payload-inspection.js';

describe('findViolation (input hardening)', () => {
  it('accepts ordinary nested input', () => {
    expect(
      findViolation({
        name: "Ana O'Brien",
        content: { notes: 'Salary < 5L, maths: 3 < 4', tags: ['a', 'b'] },
      }),
    ).toBeNull();
  });

  it('lets SQL-looking text through: parameterized queries make it harmless', () => {
    expect(
      findViolation({ fullName: "Robert'); DROP TABLE users;--" }),
    ).toBeNull();
  });

  it('refuses a reserved name inside a bracketed or dotted query key', () => {
    expect(findViolation({ 'constructor[prototype]': '1' })).toBe(
      'a reserved key',
    );
    expect(findViolation({ 'a.__proto__.b': '1' })).toBe('a reserved key');
    expect(findViolation({ constructorName: 'ok' })).toBeNull();
  });

  it.each([
    ['__proto__', JSON.parse('{"__proto__": {"isAdmin": true}}') as unknown],
    ['constructor', { a: { constructor: { prototype: { x: 1 } } } }],
    ['prototype', { list: [{ prototype: 1 }] }],
  ])('refuses a %s key at any depth', (_, payload) => {
    expect(findViolation(payload)).toBe('a reserved key');
  });

  it.each([
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '</textarea>',
    '<!-- x -->',
    'JavaScript:alert(1)',
  ])('refuses markup: %s', (text) => {
    expect(findViolation({ conductSummary: text })).toBe('markup');
  });

  it('allows "<" in a password, which is never rendered', () => {
    expect(findViolation({ password: 'P<a55word!' })).toBeNull();
  });

  it('refuses control characters', () => {
    expect(findViolation({ name: 'nul\u0000byte' })).toBe('control characters');
    expect(findViolation({ notes: 'line one\nline two\ttabbed' })).toBeNull();
  });

  it('refuses absurd nesting', () => {
    let deep: unknown = 'x';
    for (let i = 0; i < 12; i++) deep = { d: deep };
    expect(findViolation(deep)).toBe('nesting too deep');
  });
});
