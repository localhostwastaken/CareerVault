// R10 field-encryption audit: proves the fields in ENCRYPTED_FIELDS are ciphertext at
// rest. Rows are read the way a database dump sees them, through a plain client without
// the decrypting extension, and every envelope must open under this deployment's key.
// Rows written before R10 existed are reported as plaintext.
//
// Prints counts only, never a value. Exits 1 if any value is plaintext or undecryptable.
//
// Run:  npm run db:audit-encryption
import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { ENCRYPTED_FIELDS } from '../src/prisma/encryption/encrypted-fields.js';
import {
  FieldCipher,
  isEnvelope,
} from '../src/services/key-management/field-cipher.js';
import { LocalKmsService } from '../src/services/key-management/local-kms.service.js';

type Verdict = 'encrypted' | 'null' | 'plaintext' | 'undecryptable';
type Row = Record<string, unknown>;

interface AuditLine {
  target: string;
  rows: number;
  counts: Record<Verdict, number>;
}

/** One block of the report, covering one place R10 data is kept. */
interface AuditSection {
  title: string;
  heading: string;
  run(): Promise<AuditLine[]>;
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });
const cipher = new FieldCipher(new LocalKmsService(new ConfigService()));

// Keyed by model so that adding a model to ENCRYPTED_FIELDS without a scan here fails to
// compile instead of silently going unaudited.
const SCANS: Record<
  keyof typeof ENCRYPTED_FIELDS,
  (field: string) => Promise<Row[]>
> = {
  Document: (field) =>
    prisma.document.findMany({ select: { id: true, [field]: true } }),
  DocumentVersion: (field) =>
    prisma.documentVersion.findMany({ select: { id: true, [field]: true } }),
};

async function classify(field: string, value: unknown): Promise<Verdict> {
  if (value === null) return 'null';
  if (!isEnvelope(value)) return 'plaintext';
  try {
    await cipher.decrypt(field, value);
    return 'encrypted';
  } catch {
    return 'undecryptable';
  }
}

const databaseFields: AuditSection = {
  title: 'Database fields',
  heading: 'model.field',
  async run() {
    const lines: AuditLine[] = [];
    for (const [model, fields] of Object.entries(ENCRYPTED_FIELDS)) {
      const scan = SCANS[model as keyof typeof ENCRYPTED_FIELDS];
      for (const field of fields) {
        const rows = await scan(field);
        const counts = {
          encrypted: 0,
          null: 0,
          plaintext: 0,
          undecryptable: 0,
        };
        for (const row of rows) counts[await classify(field, row[field])] += 1;
        lines.push({ target: `${model}.${field}`, rows: rows.length, counts });
      }
    }
    return lines;
  },
};

const SECTIONS: AuditSection[] = [databaseFields];

function printTable(section: AuditSection, lines: AuditLine[]): void {
  const header = [
    section.heading,
    'rows',
    'encrypted ✓',
    'null',
    'plaintext ✗',
    'undecryptable ✗',
  ];
  const body = lines.map(({ target, rows, counts }) => [
    target,
    ...[
      rows,
      counts.encrypted,
      counts.null,
      counts.plaintext,
      counts.undecryptable,
    ].map(String),
  ]);
  const widths = header.map((title, i) =>
    Math.max(title.length, ...body.map((cells) => cells[i].length)),
  );
  const format = (cells: string[]) =>
    cells
      .map((cell, i) =>
        i === 0 ? cell.padEnd(widths[i]) : cell.padStart(widths[i]),
      )
      .join(' | ');
  console.log(`\n${section.title}\n${format(header)}`);
  for (const cells of body) console.log(format(cells));
}

async function main(): Promise<void> {
  let plaintext = 0;
  let undecryptable = 0;
  for (const section of SECTIONS) {
    const lines = await section.run();
    printTable(section, lines);
    for (const { counts } of lines) {
      plaintext += counts.plaintext;
      undecryptable += counts.undecryptable;
    }
  }
  if (plaintext + undecryptable === 0) {
    console.log('\nPASS: every value is encrypted or null.');
    return;
  }
  console.log(
    `\nFAIL: ${plaintext} plaintext and ${undecryptable} undecryptable value(s).`,
  );
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
