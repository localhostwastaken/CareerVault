import { Prisma } from '../../generated/prisma/client.js';
import { ENCRYPTED_FIELDS, ENCRYPTED_FIELD_NAMES } from './encrypted-fields.js';

// Prisma never tells a query extension which model a nested result came from, so the
// extension recognises an encrypted field by its NAME alone. That is only sound while the
// schema keeps these two facts true.
const scalarFields = (model: string): string[] =>
  Object.keys(
    (Prisma as unknown as Record<string, object>)[`${model}ScalarFieldEnum`],
  );

describe('ENCRYPTED_FIELDS (R10 field encryption)', () => {
  it('names only fields that exist on their model', () => {
    for (const [model, fields] of Object.entries(ENCRYPTED_FIELDS)) {
      expect(scalarFields(model)).toEqual(expect.arrayContaining([...fields]));
    }
  });

  it('uses field names that no other model has', () => {
    const others = Object.values(Prisma.ModelName).filter(
      (model) => !(model in ENCRYPTED_FIELDS),
    );

    for (const model of others) {
      const clashes = scalarFields(model).filter((field) =>
        ENCRYPTED_FIELD_NAMES.has(field),
      );
      expect({ model, clashes }).toEqual({ model, clashes: [] });
    }
  });
});
