-- Snapshot, on each document, the org public key its signatures were made under.
--
-- Verification previously resolved the key through organizations.public_key_pem, i.e. the
-- org's CURRENT key. That made replacing an org key destructive: every document already
-- issued would stop verifying. Recording the key alongside the signature decouples the two,
-- which is what allows a lost key store to be re-keyed without invalidating history.
--
-- NOTE: the DropIndex statements Prisma generates here are deliberately omitted. Both
-- `*_embedding_hnsw_idx` indexes are hand-written in 20260810154422_pgvector_ann_index over
-- `Unsupported("vector(384)")` columns that Prisma cannot express, so it re-proposes
-- dropping them on every diff. Dropping them turns talent search back into a sequential scan.

ALTER TABLE "documents" ADD COLUMN "signing_public_key_pem" TEXT;

-- Backfill everything already signed. Without this, documents issued before this migration
-- would fall back to the org's current key and break the moment one is ever rotated.
UPDATE "documents" d
SET "signing_public_key_pem" = o."public_key_pem"
FROM "organizations" o
WHERE d."organization_id" = o."id"
  AND d."manager_signature" IS NOT NULL
  AND o."public_key_pem" IS NOT NULL;
