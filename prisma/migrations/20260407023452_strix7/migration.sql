/*
  Warnings:

  - A unique constraint covering the columns `[barcode]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employee_number]` on the table `profiles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[po_number]` on the table `purchase_orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "barcode_type" TEXT,
ADD COLUMN     "brand" TEXT,
ADD COLUMN     "case_pack_qty" DECIMAL(10,3),
ADD COLUMN     "country_of_origin" TEXT,
ADD COLUMN     "is_perishable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "min_order_qty" DECIMAL(10,3),
ADD COLUMN     "product_notes" TEXT,
ADD COLUMN     "store_id" UUID,
ADD COLUMN     "tax_category" TEXT NOT NULL DEFAULT 'exempt',
ADD COLUMN     "vendor_sku" TEXT,
ADD COLUMN     "weight_grams" DECIMAL(8,2);

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "emergency_contact_name" TEXT,
ADD COLUMN     "emergency_contact_phone" TEXT,
ADD COLUMN     "emergency_contact_relation" TEXT,
ADD COLUMN     "employee_number" TEXT,
ADD COLUMN     "exit_date" DATE,
ADD COLUMN     "food_handler_cert_expiry" DATE,
ADD COLUMN     "hire_date" DATE,
ADD COLUMN     "i9_verification_date" DATE,
ADD COLUMN     "i9_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pay_type" TEXT NOT NULL DEFAULT 'hourly',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "store_id" UUID;

-- AlterTable
ALTER TABLE "purchase_order_items" ADD COLUMN     "qty_shipped" DECIMAL(10,3);

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "expected_at" DATE,
ADD COLUMN     "invoice_date" DATE,
ADD COLUMN     "invoice_number" TEXT,
ADD COLUMN     "po_number" TEXT,
ADD COLUMN     "shipped_at" TIMESTAMPTZ,
ADD COLUMN     "store_id" UUID,
ADD COLUMN     "tracking_ref" TEXT;

-- AlterTable
ALTER TABLE "stock_ledger" ADD COLUMN     "store_id" UUID;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lead_time_days" INTEGER,
ADD COLUMN     "min_order_amount" DECIMAL(10,2),
ADD COLUMN     "payment_terms" TEXT,
ADD COLUMN     "tax_id" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_store_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "reorder_point" INTEGER NOT NULL DEFAULT 0,
    "reorder_qty" INTEGER NOT NULL DEFAULT 0,
    "is_carried" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_store_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_counts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "counted_by" UUID NOT NULL,
    "completed_by" UUID,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventory_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_count_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inventory_count_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "system_qty" DECIMAL(10,3) NOT NULL,
    "counted_qty" DECIMAL(10,3),
    "variance_qty" DECIMAL(10,3),
    "variance_value" DECIMAL(10,2),
    "is_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "ledger_entry_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "schedule_id" UUID,
    "clock_in_at" TIMESTAMPTZ NOT NULL,
    "clock_out_at" TIMESTAMPTZ,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,
    "hours_worked" DECIMAL(6,2),
    "source" TEXT NOT NULL DEFAULT 'manual',
    "approved_by" UUID,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "doc_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "expiry_date" DATE,
    "storage_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" UUID,
    "notes" TEXT,
    "uploaded_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "store_id" UUID,
    "week_start" DATE NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "position" TEXT,
    "note" TEXT,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "cancel_reason" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'weekly',
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "payroll_period_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "actual_hours" DECIMAL(6,2),
    "hourly_rate" DECIMAL(8,2),
    "regular_hours" DECIMAL(6,2),
    "overtime_hours" DECIMAL(6,2),
    "gross_pay" DECIMAL(10,2),
    "payroll_external_id" TEXT,
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payroll_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_name_key" ON "stores"("name");

-- CreateIndex
CREATE UNIQUE INDEX "product_store_config_product_id_store_id_key" ON "product_store_config"("product_id", "store_id");

-- CreateIndex
CREATE INDEX "inventory_counts_store_id_status_idx" ON "inventory_counts"("store_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_count_items_inventory_count_id_product_id_key" ON "inventory_count_items"("inventory_count_id", "product_id");

-- CreateIndex
CREATE INDEX "time_entries_profile_id_clock_in_at_idx" ON "time_entries"("profile_id", "clock_in_at");

-- CreateIndex
CREATE INDEX "time_entries_store_id_clock_in_at_idx" ON "time_entries"("store_id", "clock_in_at");

-- CreateIndex
CREATE INDEX "employee_documents_profile_id_doc_type_idx" ON "employee_documents"("profile_id", "doc_type");

-- CreateIndex
CREATE INDEX "employee_documents_expiry_date_idx" ON "employee_documents"("expiry_date");

-- CreateIndex
CREATE INDEX "notifications_profile_id_is_read_idx" ON "notifications"("profile_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "schedule_week_start_idx" ON "schedule"("week_start");

-- CreateIndex
CREATE INDEX "schedule_profile_id_idx" ON "schedule"("profile_id");

-- CreateIndex
CREATE INDEX "schedule_week_start_profile_id_idx" ON "schedule"("week_start", "profile_id");

-- CreateIndex
CREATE INDEX "schedule_store_id_week_start_idx" ON "schedule"("store_id", "week_start");

-- CreateIndex
CREATE INDEX "payroll_periods_period_start_idx" ON "payroll_periods"("period_start");

-- CreateIndex
CREATE INDEX "payroll_entries_payroll_period_id_idx" ON "payroll_entries"("payroll_period_id");

-- CreateIndex
CREATE INDEX "payroll_entries_profile_id_idx" ON "payroll_entries"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_entries_payroll_period_id_profile_id_key" ON "payroll_entries"("payroll_period_id", "profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_employee_number_key" ON "profiles"("employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "stock_ledger_product_id_store_id_idx" ON "stock_ledger"("product_id", "store_id");

-- CreateIndex
CREATE INDEX "stock_ledger_store_id_created_at_idx" ON "stock_ledger"("store_id", "created_at");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_store_config" ADD CONSTRAINT "product_store_config_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_store_config" ADD CONSTRAINT "product_store_config_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_ledger" ADD CONSTRAINT "stock_ledger_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_inventory_count_id_fkey" FOREIGN KEY ("inventory_count_id") REFERENCES "inventory_counts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
