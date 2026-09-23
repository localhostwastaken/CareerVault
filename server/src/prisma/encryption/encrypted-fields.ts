// R10 field encryption: the columns stored only as FieldCipher envelopes. Keys are Prisma
// model names as `$allOperations` receives them; each field name is also its cipher label,
// so the AAD is `careervault|<field>|v1`.
//
// Every name here exists on no other model in schema.prisma (encrypted-fields.spec.ts
// holds that), which is what lets a nested result's field be recognised by its key alone.
export const ENCRYPTED_FIELDS = {
  Document: [
    'contentJson',
    'salt',
    'managerSignature',
    'hrSignature',
    'revocationReasonText',
  ],
  DocumentVersion: ['contentJson', 'changeSummary'],
} as const;

/** Json columns: sealed as their JSON text, stored as a JSON string. */
export const JSON_FIELDS: ReadonlySet<string> = new Set(['contentJson']);

export const ENCRYPTED_FIELD_NAMES: ReadonlySet<string> = new Set(
  Object.values(ENCRYPTED_FIELDS).flat(),
);
