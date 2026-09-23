-- Record which chain and contract each Merkle root was anchored to, so verification and the
-- downloadable credential can name the network and link to it. Both stay NULL for roots
-- anchored by the LocalAnchor simulator (BLOCKCHAIN_DRIVER=local).
--
-- NOTE: the DropIndex statements Prisma generates here are deliberately omitted, as in
-- 20260818124432_document_signing_public_key: both `*_embedding_hnsw_idx` indexes are
-- hand-written over `Unsupported("vector(384)")` columns that Prisma cannot express, so it
-- re-proposes dropping them on every diff.

-- AlterTable
ALTER TABLE "merkle_roots" ADD COLUMN     "chain_id" INTEGER,
ADD COLUMN     "contract_address" TEXT;
