-- CreateEnum
CREATE TYPE "EmployeeKeyStatus" AS ENUM ('ACTIVE', 'RETIRED');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "hr_key_id" UUID,
ADD COLUMN     "hr_seal" TEXT,
ADD COLUMN     "manager_key_id" UUID,
ADD COLUMN     "manager_seal" TEXT;

-- CreateTable
CREATE TABLE "employee_keys" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "kdf_salt" TEXT NOT NULL,
    "kdf_iterations" INTEGER NOT NULL,
    "question_ids" TEXT[],
    "wrapped_key" TEXT NOT NULL,
    "status" "EmployeeKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retired_at" TIMESTAMP(3),

    CONSTRAINT "employee_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_keys_user_id_organization_id_status_idx" ON "employee_keys"("user_id", "organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "employee_keys_user_id_organization_id_version_key" ON "employee_keys"("user_id", "organization_id", "version");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_manager_key_id_fkey" FOREIGN KEY ("manager_key_id") REFERENCES "employee_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_hr_key_id_fkey" FOREIGN KEY ("hr_key_id") REFERENCES "employee_keys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_keys" ADD CONSTRAINT "employee_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_keys" ADD CONSTRAINT "employee_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
