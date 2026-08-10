-- AlterTable
ALTER TABLE "verifier_api_keys" ADD COLUMN     "monthly_usage_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "usage_reset_at" TIMESTAMP(3);
