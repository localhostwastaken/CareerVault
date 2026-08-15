-- pgvector ANN indexes.
--
-- Written by hand: both `embedding` columns are `Unsupported("vector(384)")` in
-- schema.prisma, so Prisma cannot express (or diff) an index over them.
--
-- Without these, every talent search is an exact KNN sequential scan over the whole
-- table -- O(n) in documents, and the cost is paid on each recruiter search.
--
-- HNSW (not IVFFlat): it needs no training rows, so it is correct on an empty table
-- and stays correct as data arrives, which matters because these tables start empty.
-- `vector_cosine_ops` is required to match the `<=>` cosine-distance operator used by
-- the retrieval queries -- an index built with a different opclass is simply ignored.

CREATE INDEX IF NOT EXISTS "extracted_skills_embedding_hnsw_idx"
  ON "extracted_skills" USING hnsw ("embedding" vector_cosine_ops);

-- Job openings are currently read by id, but the column is a vector(384) populated on
-- every create; index it so reverse matching (opening <-> opening / candidate -> job)
-- does not silently regress to a sequential scan when it is added.
CREATE INDEX IF NOT EXISTS "recruiter_job_openings_embedding_hnsw_idx"
  ON "recruiter_job_openings" USING hnsw ("embedding" vector_cosine_ops);
