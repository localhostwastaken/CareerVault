CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('ORG_ADMIN', 'MANAGER', 'HR', 'RECRUITER');

-- CreateEnum
CREATE TYPE "OrgTier" AS ENUM ('FREE', 'STARTER', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('HOLDER_PREMIUM', 'VERIFIER_BASIC', 'VERIFIER_ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('EXPERIENCE_LETTER', 'LETTER_OF_RECOMMENDATION', 'SALARY_PROOF');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('REQUESTED', 'DRAFT', 'PENDING_HR', 'ISSUED', 'ANCHORED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RevocationCode" AS ENUM ('ADMINISTRATIVE_ERROR', 'POLICY_VIOLATION', 'ISSUED_IN_ERROR');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('SUBSCRIPTION', 'ONE_TIME_LINK', 'API_ACCESS');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "MagicLinkPurpose" AS ENUM ('MANAGER_SIGN', 'EMAIL_VERIFY', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM', 'CRON');

-- CreateEnum
CREATE TYPE "RetentionTier" AS ENUM ('STANDARD', 'COMPLIANCE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DOCUMENT_REQUESTED', 'PENDING_HR_REVIEW', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'DOCUMENT_ISSUED', 'DOCUMENT_ANCHORED', 'DOCUMENT_REVOKED', 'LINK_VIEWED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'RECRUITER_MESSAGE', 'TALENT_MATCH');

-- CreateEnum
CREATE TYPE "VerifierKeyTier" AS ENUM ('BASIC', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "VerifierKeyStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "BulkBatchStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('JUNIOR', 'MID', 'SENIOR', 'LEAD');

-- CreateEnum
CREATE TYPE "SearchScope" AS ENUM ('SAME_ORG', 'ALL_ORGS');

-- CreateEnum
CREATE TYPE "MessageResponse" AS ENUM ('PENDING', 'INTERESTED', 'NOT_INTERESTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "email_verified_at" TIMESTAMP(3),
    "is_discoverable" BOOLEAN NOT NULL DEFAULT false,
    "gdpr_deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "dns_token" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verification_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_verification_error" TEXT,
    "root_did" TEXT,
    "kms_key_id" TEXT,
    "public_key_pem" TEXT,
    "subscription_tier" "OrgTier" NOT NULL DEFAULT 'FREE',
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "role" "MemberRole" NOT NULL,
    "corporate_email" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invited_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'REQUESTED',
    "holder_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "signer_member_id" UUID,
    "approver_member_id" UUID,
    "content_json" JSONB NOT NULL,
    "rendered_pdf_url" TEXT,
    "salt" TEXT,
    "document_hash" TEXT,
    "manager_signature" TEXT,
    "hr_signature" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "enable_skill_extraction" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "revocation_reason_code" "RevocationCode",
    "revocation_reason_text" TEXT,
    "revoked_at" TIMESTAMP(3),
    "revoked_by" UUID,
    "issued_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "content_json" JSONB NOT NULL,
    "changed_by" UUID NOT NULL,
    "change_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merkle_roots" (
    "id" UUID NOT NULL,
    "root_hash" TEXT NOT NULL,
    "polygon_tx_hash" TEXT,
    "polygon_block_number" BIGINT,
    "document_count" INTEGER NOT NULL,
    "ipfs_cid" TEXT,
    "github_commit_url" TEXT,
    "anchored_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merkle_roots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_merkle_proofs" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "merkle_root_id" UUID NOT NULL,
    "proof_path" JSONB NOT NULL,
    "leaf_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_merkle_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_links" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "url_token" TEXT NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "payment_id" UUID,
    "views" INTEGER NOT NULL DEFAULT 0,
    "max_views" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tier" "SubscriptionTier" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripe_subscription_id" TEXT,
    "started_at" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "type" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripe_payment_intent_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "magic_links" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "purpose" "MagicLinkPurpose" NOT NULL,
    "document_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "magic_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "actor_type" "ActorType" NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "retention_tier" "RetentionTier" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifier_api_keys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID,
    "api_key_hash" TEXT NOT NULL,
    "name" TEXT,
    "tier" "VerifierKeyTier" NOT NULL DEFAULT 'BASIC',
    "status" "VerifierKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifier_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_issuance_batches" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "initiated_by" UUID NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "status" "BulkBatchStatus" NOT NULL DEFAULT 'PROCESSING',
    "total_rows" INTEGER NOT NULL,
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "error_rows" INTEGER NOT NULL DEFAULT 0,
    "errors_json" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "bulk_issuance_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_skills" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "skills_json" JSONB NOT NULL,
    "confidence_scores" JSONB,
    "job_title" TEXT,
    "seniority" "Seniority",
    "years_of_experience" INTEGER,
    "industries_json" JSONB,
    "embedding" vector(384),
    "nlp_model_version" TEXT,
    "extracted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extracted_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "search_scope" "SearchScope" NOT NULL DEFAULT 'SAME_ORG',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_job_openings" (
    "id" UUID NOT NULL,
    "recruiter_profile_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "required_skills_json" JSONB NOT NULL,
    "seniority" "Seniority",
    "years_exp_min" INTEGER,
    "embedding" vector(384),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruiter_job_openings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talent_matches" (
    "id" UUID NOT NULL,
    "job_opening_id" UUID NOT NULL,
    "holder_id" UUID NOT NULL,
    "match_score" DOUBLE PRECISION NOT NULL,
    "shap_explanation_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "talent_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_messages" (
    "id" UUID NOT NULL,
    "recruiter_profile_id" UUID NOT NULL,
    "holder_id" UUID NOT NULL,
    "job_opening_id" UUID,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),
    "response_type" "MessageResponse" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "recruiter_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_domain_key" ON "organizations"("domain");

-- CreateIndex
CREATE INDEX "organizations_is_verified_idx" ON "organizations"("is_verified");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_role_idx" ON "organization_members"("organization_id", "role");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_user_id_organization_id_role_key" ON "organization_members"("user_id", "organization_id", "role");

-- CreateIndex
CREATE INDEX "documents_holder_id_status_created_at_idx" ON "documents"("holder_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "documents_organization_id_status_idx" ON "documents"("organization_id", "status");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_document_hash_idx" ON "documents"("document_hash");

-- CreateIndex
CREATE INDEX "documents_expires_at_idx" ON "documents"("expires_at");

-- CreateIndex
CREATE INDEX "documents_signer_member_id_idx" ON "documents"("signer_member_id");

-- CreateIndex
CREATE INDEX "documents_organization_id_type_idx" ON "documents"("organization_id", "type");

-- CreateIndex
CREATE INDEX "document_versions_document_id_idx" ON "document_versions"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "merkle_roots_root_hash_key" ON "merkle_roots"("root_hash");

-- CreateIndex
CREATE UNIQUE INDEX "merkle_roots_polygon_tx_hash_key" ON "merkle_roots"("polygon_tx_hash");

-- CreateIndex
CREATE UNIQUE INDEX "document_merkle_proofs_document_id_key" ON "document_merkle_proofs"("document_id");

-- CreateIndex
CREATE INDEX "document_merkle_proofs_merkle_root_id_idx" ON "document_merkle_proofs"("merkle_root_id");

-- CreateIndex
CREATE UNIQUE INDEX "shared_links_url_token_key" ON "shared_links"("url_token");

-- CreateIndex
CREATE UNIQUE INDEX "shared_links_payment_id_key" ON "shared_links"("payment_id");

-- CreateIndex
CREATE INDEX "shared_links_document_id_is_active_expires_at_idx" ON "shared_links"("document_id", "is_active", "expires_at");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_stripe_subscription_id_idx" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_stripe_payment_intent_id_idx" ON "payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE UNIQUE INDEX "magic_links_token_hash_key" ON "magic_links"("token_hash");

-- CreateIndex
CREATE INDEX "magic_links_email_purpose_idx" ON "magic_links"("email", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_retention_tier_created_at_idx" ON "audit_logs"("retention_tier", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "verifier_api_keys_api_key_hash_key" ON "verifier_api_keys"("api_key_hash");

-- CreateIndex
CREATE INDEX "verifier_api_keys_user_id_status_idx" ON "verifier_api_keys"("user_id", "status");

-- CreateIndex
CREATE INDEX "bulk_issuance_batches_organization_id_status_started_at_idx" ON "bulk_issuance_batches"("organization_id", "status", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "extracted_skills_document_id_key" ON "extracted_skills"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_profiles_user_id_key" ON "recruiter_profiles"("user_id");

-- CreateIndex
CREATE INDEX "recruiter_job_openings_organization_id_idx" ON "recruiter_job_openings"("organization_id");

-- CreateIndex
CREATE INDEX "talent_matches_job_opening_id_match_score_idx" ON "talent_matches"("job_opening_id", "match_score");

-- CreateIndex
CREATE UNIQUE INDEX "talent_matches_job_opening_id_holder_id_key" ON "talent_matches"("job_opening_id", "holder_id");

-- CreateIndex
CREATE INDEX "recruiter_messages_holder_id_idx" ON "recruiter_messages"("holder_id");

-- CreateIndex
CREATE INDEX "recruiter_messages_recruiter_profile_id_idx" ON "recruiter_messages"("recruiter_profile_id");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_signer_member_id_fkey" FOREIGN KEY ("signer_member_id") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_approver_member_id_fkey" FOREIGN KEY ("approver_member_id") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_revoked_by_fkey" FOREIGN KEY ("revoked_by") REFERENCES "organization_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_merkle_proofs" ADD CONSTRAINT "document_merkle_proofs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_merkle_proofs" ADD CONSTRAINT "document_merkle_proofs_merkle_root_id_fkey" FOREIGN KEY ("merkle_root_id") REFERENCES "merkle_roots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifier_api_keys" ADD CONSTRAINT "verifier_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifier_api_keys" ADD CONSTRAINT "verifier_api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_issuance_batches" ADD CONSTRAINT "bulk_issuance_batches_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_issuance_batches" ADD CONSTRAINT "bulk_issuance_batches_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "organization_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_skills" ADD CONSTRAINT "extracted_skills_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_profiles" ADD CONSTRAINT "recruiter_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_profiles" ADD CONSTRAINT "recruiter_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_job_openings" ADD CONSTRAINT "recruiter_job_openings_recruiter_profile_id_fkey" FOREIGN KEY ("recruiter_profile_id") REFERENCES "recruiter_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_job_openings" ADD CONSTRAINT "recruiter_job_openings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_matches" ADD CONSTRAINT "talent_matches_job_opening_id_fkey" FOREIGN KEY ("job_opening_id") REFERENCES "recruiter_job_openings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talent_matches" ADD CONSTRAINT "talent_matches_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_messages" ADD CONSTRAINT "recruiter_messages_recruiter_profile_id_fkey" FOREIGN KEY ("recruiter_profile_id") REFERENCES "recruiter_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_messages" ADD CONSTRAINT "recruiter_messages_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_messages" ADD CONSTRAINT "recruiter_messages_job_opening_id_fkey" FOREIGN KEY ("job_opening_id") REFERENCES "recruiter_job_openings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
