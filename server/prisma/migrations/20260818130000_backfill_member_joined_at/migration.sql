-- Backfill organization_members.joined_at.
--
-- Only the org founder and the seed script ever set it; members added through
-- POST /orgs/:id/members were written with invited_at alone. A sort over the resulting
-- all-NULL column is arbitrary, which made "assign any available manager" pick an
-- unpredictable manager — and since only the ASSIGNED manager may sign, requests could
-- land on someone nobody expected with no way to reassign.
--
-- Active memberships are usable from the moment they are created (there is no accept step),
-- so invited_at is the honest join time for existing rows.

UPDATE "organization_members"
SET "joined_at" = COALESCE("invited_at", NOW())
WHERE "joined_at" IS NULL;
