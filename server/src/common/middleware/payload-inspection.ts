/**
 * What the payload guard refuses anywhere in a request body or query string, before any
 * DTO is built (input hardening). Pure, so it is tested directly.
 *
 * - `__proto__`, `constructor`, `prototype` as keys: prototype pollution. JSON.parse keeps
 *   `__proto__` as an ordinary own key, so a later Object.assign or deep merge would write
 *   it onto Object.prototype.
 * - Markup (`<tag`, `</tag`, `<!`, `javascript:`): free text ends up in PDFs rendered by a
 *   headless browser and in notification emails. A legitimate career document has no use for
 *   it, so it is refused rather than escaped at every sink.
 * - ASCII control characters other than tab, newline and carriage return.
 * - Nesting deeper than any DTO needs.
 *
 * SQL keywords are deliberately NOT here: every query is parameterized (Prisma, or tagged
 * $queryRaw templates), so "'; DROP TABLE users; --" in a name is stored as text, harmlessly,
 * and blocking words like "select" or names like O'Brien would only break real input.
 * Identifier-shaped fields get strict allow-list formats in their DTOs instead.
 */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MARKUP = /<\s*[a-z!/?]|javascript\s*:/i;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const MAX_DEPTH = 8;
// Secrets are never rendered anywhere, and a password may legitimately contain "<a".
const SECRET_KEY = /password/i;

// Each segment counts, so "constructor[prototype]" or "a.__proto__" is caught even when a
// flat query parser leaves it as one literal key (a nested parser would expand it).
function isReservedKey(key: string): boolean {
  return key.split(/[[\].]/).some((segment) => FORBIDDEN_KEYS.has(segment));
}

export function findViolation(
  value: unknown,
  key = '',
  depth = 0,
): string | null {
  if (depth > MAX_DEPTH) return 'nesting too deep';
  if (typeof value === 'string') {
    if (CONTROL_CHARS.test(value)) return 'control characters';
    if (!SECRET_KEY.test(key) && MARKUP.test(value)) return 'markup';
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findViolation(item, key, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const [childKey, child] of Object.entries(value)) {
      if (isReservedKey(childKey)) return 'a reserved key';
      const found = findViolation(child, childKey, depth + 1);
      if (found) return found;
    }
  }
  return null;
}
