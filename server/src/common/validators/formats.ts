// Allow-list formats for identifier-shaped input (input hardening). An identifier may hold
// only the characters it can genuinely contain, so a quote, a semicolon or a space never gets
// in, and an injection-style payload in one of these fields is refused at the DTO. Free text
// is covered by the payload guard; queries are parameterized everywhere regardless.
export const FORMATS = {
  // magic-link and password-reset tokens: randomBytes(32) as hex
  hexToken64: /^[0-9a-f]{64}$/,
  // audit-log filters: ACTION_NAME / ENTITY_TYPE
  auditCode: /^[A-Z][A-Z_]{0,63}$/,
  // an organisation's own employee code, e.g. EMP-0001, TC/2041
  employeeCode: /^[A-Za-z0-9][A-Za-z0-9/._-]{0,63}$/,
  phone: /^\+?[0-9][0-9 ()-]{6,19}$/,
  // MockStripe checkout session ids
  mockSessionId: /^cs_mock_(?:sub_)?[0-9a-f]{16}$/,
} as const;
