-- Add missing columns to outputs to match Prisma schema
-- Note: Columns use quoted camelCase to align with Prisma field names

ALTER TABLE "outputs" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "outputs" ADD COLUMN IF NOT EXISTS "coverPrompt" TEXT;
ALTER TABLE "outputs" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT;


