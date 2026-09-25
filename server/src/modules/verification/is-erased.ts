import type { Prisma } from '../../generated/prisma/client.js';

// GDPR Art. 17 (UserService.deleteAccount). Erasure nulls the salt and scrubs the content to
// {} on every one of the holder's documents, keeping only the hash, the signatures and the
// Merkle proof. An issued document loses its salt or content no other way, so what remains
// must read as erased rather than tampered with, and must disclose nothing about the holder.

export const ERASURE_DETAIL =
  'The holder exercised their right to erasure; the original content no longer exists.';

/** Call only for an issued document: before signing, a document has no salt yet. */
export function isErased(doc: {
  salt: string | null;
  contentJson: Prisma.JsonValue;
}): boolean {
  const content = doc.contentJson;
  const scrubbed =
    typeof content === 'object' &&
    content !== null &&
    !Array.isArray(content) &&
    Object.keys(content).length === 0;
  return !doc.salt || scrubbed;
}
