-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "secondary_store_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "schedule" ADD COLUMN     "shift_type" TEXT NOT NULL DEFAULT 'work';
