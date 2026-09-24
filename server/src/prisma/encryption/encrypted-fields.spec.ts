import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Prisma } from '../../generated/prisma/client.js';
import {
  ENCRYPTED_FIELDS,
  ENCRYPTED_FIELD_NAMES,
  PLAIN_JSON_FIELDS,
  PLAIN_JSON_FIELD_NAMES,
} from './encrypted-fields.js';

// Prisma never tells a query extension which model a nested result came from, so the
// extension recognises an encrypted field by its NAME alone. That is only sound while the
// schema keeps these two facts true.
const scalarFields = (model: string): string[] =>
  Object.keys(
    (Prisma as unknown as Record<string, object>)[`${model}ScalarFieldEnum`],
  );

// Field types are not exposed by the generated client's public API, so they come from the
// schema itself (npm test always runs from server/, as crypto.util.spec relies on too).
const SCHEMA = readFileSync(
  join(process.cwd(), 'prisma/schema.prisma'),
  'utf8',
);
// Line by line, since a field's trailing comment may itself contain braces.
const MODELS: { name: string; fields: { field: string; type: string }[] }[] =
  [];
let current: (typeof MODELS)[number] | undefined;
for (const line of SCHEMA.split('\n')) {
  const start = /^model (\w+) \{/.exec(line);
  const field = /^\s+(\w+)\s+(\w+)/.exec(line);
  if (start) MODELS.push((current = { name: start[1], fields: [] }));
  else if (line.startsWith('}')) current = undefined;
  else if (current && field)
    current.fields.push({ field: field[1], type: field[2] });
}
const MODEL_NAMES = new Set(MODELS.map((m) => m.name));

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

// The read walk skips these columns' values as caller data, so a key inside one (an AI
// skill named `salt`) is never taken for an encrypted field.
describe('PLAIN_JSON_FIELDS (Json columns the read walk never enters)', () => {
  it('lists every Json column that is not encrypted, and nothing else', () => {
    const encrypted: Record<string, readonly string[]> = ENCRYPTED_FIELDS;
    const expected = MODELS.map(({ name, fields }) => [
      name,
      fields
        .filter(({ type }) => type === 'Json')
        .map(({ field }) => field)
        .filter((field) => !encrypted[name]?.includes(field)),
    ]).filter(([, fields]) => fields.length > 0);

    expect(Object.fromEntries(expected)).toEqual(PLAIN_JSON_FIELDS);
  });

  it('uses names that are never a relation or an encrypted field', () => {
    const relations = MODELS.flatMap(({ fields }) =>
      fields.filter(({ type }) => MODEL_NAMES.has(type)),
    ).map(({ field }) => field);

    const clashes = [...PLAIN_JSON_FIELD_NAMES].filter(
      (field) => relations.includes(field) || ENCRYPTED_FIELD_NAMES.has(field),
    );
    expect(clashes).toEqual([]);
    expect(relations.length).toBeGreaterThan(0);
  });
});
