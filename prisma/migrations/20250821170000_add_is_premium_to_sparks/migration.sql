-- Add is_premium column to sparks table
ALTER TABLE "sparks" ADD COLUMN IF NOT EXISTS "is_premium" BOOLEAN NOT NULL DEFAULT false;


