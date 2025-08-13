-- Add missing predefined method and competency columns to patterns table
-- These columns are needed for the artist analysis system to properly track
-- which methods and competencies are predefined vs user-generated

-- AlterTable
ALTER TABLE "patterns" ADD COLUMN "is_predefined_method" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable  
ALTER TABLE "patterns" ADD COLUMN "is_predefined_competency" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex for performance on predefined queries
CREATE INDEX "idx_patterns_predefined_method" ON "patterns"("is_predefined_method");
CREATE INDEX "idx_patterns_predefined_competency" ON "patterns"("is_predefined_competency");
