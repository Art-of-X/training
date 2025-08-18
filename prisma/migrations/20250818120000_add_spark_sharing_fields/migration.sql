-- Add sharing-related fields to sparks
ALTER TABLE "sparks"
  ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "public_share_id" UUID,
  ADD COLUMN IF NOT EXISTS "profit_split_opt_in" BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure uniqueness of share id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = ANY (current_schemas(false)) AND indexname = 'sparks_public_share_id_key'
  ) THEN
    ALTER TABLE "sparks" ADD CONSTRAINT "sparks_public_share_id_key" UNIQUE ("public_share_id");
  END IF;
END $$;

