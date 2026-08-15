import type { DocumentType } from '../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

/**
 * Which subject fields assert WHO SIGNED, per document type.
 *
 * These are the only fields a signer must not be able to fill in on someone else's
 * behalf. Everything else in the subject describes the holder or the employment and is
 * legitimately the signer's to write.
 */
const SIGNER_IDENTITY_FIELDS: Record<
  DocumentType,
  { name?: string; email?: string }
> = {
  LETTER_OF_RECOMMENDATION: {
    name: 'recommenderName',
    email: 'recommenderEmail',
  },
  EXPERIENCE_LETTER: { name: 'signatoryName' },
  SALARY_PROOF: { name: 'signatoryName' },
};

/**
 * Overwrite the signer-identity fields with the authenticated signer's own details.
 *
 * Server-authoritative on purpose: the client also locks these inputs, but a locked
 * input is a courtesy, not a control — anyone can POST whatever they like. Stamping
 * here is what actually makes "signed by X" true, and it happens BEFORE the subject is
 * hashed and signed, so the signature covers the corrected values.
 */
export function stampSignerIdentity(
  type: DocumentType,
  subject: Record<string, unknown>,
  signer: Pick<AuthenticatedUser, 'fullName' | 'email'>,
): void {
  const fields = SIGNER_IDENTITY_FIELDS[type];
  if (!fields) return;
  if (fields.name) subject[fields.name] = signer.fullName;
  if (fields.email) subject[fields.email] = signer.email;
}

/** The identity field names for a type — the client uses this to lock the inputs. */
export function signerIdentityFields(type: DocumentType): string[] {
  const fields = SIGNER_IDENTITY_FIELDS[type];
  return [fields?.name, fields?.email].filter((f): f is string => Boolean(f));
}
