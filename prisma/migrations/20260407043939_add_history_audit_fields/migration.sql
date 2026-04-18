/*
  Warnings:

  - Added the required column `updated_at` to the `purchase_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `suppliers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payroll_periods" ADD COLUMN     "closed_at" TIMESTAMPTZ,
ADD COLUMN     "closed_by" UUID;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "exit_reason" TEXT,
ADD COLUMN     "rehire_eligible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "cancel_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMPTZ,
ADD COLUMN     "cancelled_by" UUID,
ADD COLUMN     "received_by" UUID,
ADD COLUMN     "sent_at" TIMESTAMPTZ,
ADD COLUMN     "sent_by" UUID,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "account_number" TEXT,
ADD COLUMN     "catalog_url" TEXT,
ADD COLUMN     "deactivated_at" TIMESTAMPTZ,
ADD COLUMN     "deactivated_by" UUID,
ADD COLUMN     "deactivation_reason" TEXT,
ADD COLUMN     "delivery_days" TEXT,
ADD COLUMN     "delivery_fee_threshold" DECIMAL(10,2),
ADD COLUMN     "is_approved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ordering_email" TEXT,
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "return_policy" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- CreateTable
CREATE TABLE "supplier_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "contact_type" TEXT NOT NULL DEFAULT 'primary',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "from_value" TEXT,
    "to_value" TEXT,
    "effective_date" DATE NOT NULL,
    "note" TEXT,
    "performed_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wage_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "hourly_rate" DECIMAL(8,2) NOT NULL,
    "effective_date" DATE NOT NULL,
    "reason" TEXT,
    "set_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wage_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_contacts_supplier_id_idx" ON "supplier_contacts"("supplier_id");

-- CreateIndex
CREATE INDEX "employment_events_profile_id_effective_date_idx" ON "employment_events"("profile_id", "effective_date");

-- CreateIndex
CREATE INDEX "wage_history_profile_id_effective_date_idx" ON "wage_history"("profile_id", "effective_date");

-- AddForeignKey
ALTER TABLE "supplier_contacts" ADD CONSTRAINT "supplier_contacts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment_events" ADD CONSTRAINT "employment_events_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wage_history" ADD CONSTRAINT "wage_history_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
