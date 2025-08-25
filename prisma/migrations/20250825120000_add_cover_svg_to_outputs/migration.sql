-- Add cover_svg column to outputs for storing inline SVG markup
ALTER TABLE "outputs" ADD COLUMN IF NOT EXISTS "cover_svg" TEXT;


