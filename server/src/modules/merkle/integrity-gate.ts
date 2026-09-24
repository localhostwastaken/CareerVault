import type { Logger } from '@nestjs/common';
import { hashDocument } from '../../common/utils/crypto.util.js';
import { isFieldReadError } from '../../prisma/encryption/field-encryption.extension.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

// Batch-time integrity gate (R4 hash, R10 field encryption). Every root the batch anchors is
// sent by CareerVault's own wallet, so a candidate joins the tree only if its encrypted
// fields still open through the extended client, where FIELD_ENCRYPTION_STRICT applies, and
// its content and salt still recompute its documentHash. A DB writer without the KEK cannot
// make an envelope, so under strict mode a planted plaintext row never reaches the chain.
// A failing document is skipped, not changed: it stays ISSUED and un-anchored for review.

interface Candidate {
  id: string;
  documentHash: string | null;
}

// Every encrypted Document field, so strict mode refuses a planted signature as well.
const ENCRYPTED_SELECT = {
  contentJson: true,
  salt: true,
  managerSignature: true,
  hrSignature: true,
  revocationReasonText: true,
} as const;

export async function integrityGate<T extends Candidate>(
  prisma: PrismaService,
  candidates: T[],
  logger: Pick<Logger, 'error'>,
): Promise<T[]> {
  const failures = await Promise.all(
    candidates.map((doc) => failureOf(prisma, doc)),
  );
  return candidates.filter((doc, index) => {
    const failure = failures[index];
    if (failure)
      logger.error(
        `Merkle batch: skipped document ${doc.id}, left un-anchored: ${failure}`,
      );
    return !failure;
  });
}

/** Why the document must not be anchored, or null. Never quotes a field's value. */
async function failureOf(
  prisma: PrismaService,
  doc: Candidate,
): Promise<string | null> {
  try {
    const row = await prisma.document.findUnique({
      where: { id: doc.id },
      select: ENCRYPTED_SELECT,
    });
    if (!row) return 'it no longer exists';
    if (!row.salt || !doc.documentHash) return 'it has no salt or hash';
    return hashDocument(row.contentJson, row.salt) === doc.documentHash
      ? null
      : 'its content and salt do not recompute its documentHash';
  } catch (error) {
    return `its stored fields could not be read (${describe(error)})`;
  }
}

// Any error but a field read error is reduced to its class name, since a message such as a
// JSON parse error's can quote the text it failed on.
function describe(error: unknown): string {
  if (isFieldReadError(error)) return error.message;
  return error instanceof Error ? error.name : 'unknown error';
}
