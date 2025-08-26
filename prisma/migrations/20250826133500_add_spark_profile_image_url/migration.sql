-- Add profile image URL to sparks (idempotent for safety across envs)
ALTER TABLE "sparks" ADD COLUMN IF NOT EXISTS "profile_image_url" TEXT;


