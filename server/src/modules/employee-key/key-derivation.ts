import { pbkdf2, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Employee key derivation (step 1 of the signing pipeline).
 *
 *   material = len ‖ "careervault/employee-key/v1" ‖ len ‖ DOB ‖ len ‖ personalId
 *              ‖ for each enrolled question, in enrolment order: len ‖ id ‖ len ‖ answer
 *   K        = PBKDF2-HMAC-SHA256(material, 16-byte random salt, 600,000 iterations, 32 bytes)
 *
 * Every field is length-prefixed (u32be) so no two different inputs concatenate to the same
 * bytes. Answers are normalized (NFKC, lowercase, trimmed, inner spaces collapsed) and the
 * identifier loses spaces and hyphens, so "  Mumbai " at signing matches "mumbai" at setup.
 *
 * These inputs are low-entropy: a date of birth and an ID are known to HR. The secrecy of K
 * comes from the random salt plus PBKDF2's cost against guessing, and from K only ever being
 * stored AES-wrapped under the server's key. What the employee's answers add is knowledge:
 * signing re-derives K from re-entered answers, so a stolen session alone cannot sign.
 */

const pbkdf2Async = promisify(pbkdf2);

// OWASP's 2023 minimum for PBKDF2-HMAC-SHA256.
export const KDF_ITERATIONS = 600_000;
const DOMAIN = 'careervault/employee-key/v1';

export interface EmployeeSecrets {
  dateOfBirth: string;
  personalId: string;
  answers: Array<{ questionId: string; answer: string }>;
}

const normalizeAnswer = (answer: string) =>
  answer.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');

const normalizePersonalId = (id: string) =>
  id.normalize('NFKC').toUpperCase().replace(/[\s-]/g, '');

function lengthPrefixed(field: string): Buffer {
  const bytes = Buffer.from(field, 'utf8');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(bytes.length);
  return Buffer.concat([length, bytes]);
}

export function secretMaterial(
  secrets: EmployeeSecrets,
  questionOrder: readonly string[],
): Buffer {
  const byId = new Map(
    secrets.answers.map(({ questionId, answer }) => [questionId, answer]),
  );
  if (
    byId.size !== questionOrder.length ||
    questionOrder.some((id) => !byId.has(id))
  )
    throw new TypeError(
      'The answers must cover exactly the enrolled questions',
    );
  const fields = [
    DOMAIN,
    secrets.dateOfBirth,
    normalizePersonalId(secrets.personalId),
    ...questionOrder.flatMap((id) => [id, normalizeAnswer(byId.get(id) ?? '')]),
  ];
  return Buffer.concat(fields.map(lengthPrefixed));
}

export function deriveEmployeeKey(
  material: Buffer,
  saltHex: string,
  iterations: number,
): Promise<Buffer> {
  return pbkdf2Async(
    material,
    Buffer.from(saltHex, 'hex'),
    iterations,
    32,
    'sha256',
  );
}

export function newKdfSalt(): string {
  return randomBytes(16).toString('hex');
}
