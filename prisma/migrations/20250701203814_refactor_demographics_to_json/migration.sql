/*
  Warnings:

  - You are about to drop the column `question_id` on the `demographics_answers` table. All the data in the column will be lost.
  - You are about to drop the `demographics_questions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[user_id,question_key]` on the table `demographics_answers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `question_key` to the `demographics_answers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `demographics_answers` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add new columns with default values
ALTER TABLE "demographics_answers" 
ADD COLUMN "question_key" TEXT DEFAULT 'temp',
ADD COLUMN "updated_at" TIMESTAMP(3) DEFAULT NOW();

-- Step 2: Map existing question_id to question_key based on order_index
-- This maps the database question IDs to the JSON question keys
UPDATE "demographics_answers" 
SET "question_key" = CASE 
  WHEN "question_id" = (SELECT id FROM "demographics_questions" WHERE "order_index" = 1) THEN 'gender'
  WHEN "question_id" = (SELECT id FROM "demographics_questions" WHERE "order_index" = 2) THEN 'age'
  WHEN "question_id" = (SELECT id FROM "demographics_questions" WHERE "order_index" = 3) THEN 'education'
  WHEN "question_id" = (SELECT id FROM "demographics_questions" WHERE "order_index" = 4) THEN 'employment'
  WHEN "question_id" = (SELECT id FROM "demographics_questions" WHERE "order_index" = 5) THEN 'income'
  WHEN "question_id" = (SELECT id FROM "demographics_questions" WHERE "order_index" = 6) THEN 'ethnicity'
  WHEN "question_id" = (SELECT id FROM "demographics_questions" WHERE "order_index" = 7) THEN 'country'
  WHEN "question_id" = (SELECT id FROM "demographics_questions" WHERE "order_index" = 8) THEN 'creative_experience'
  WHEN "question_id" = (SELECT id FROM "demographics_questions" WHERE "order_index" = 9) THEN 'creative_field'
  WHEN "question_id" = (SELECT id FROM "demographics_questions" WHERE "order_index" = 10) THEN 'financial_stability'
  WHEN "question_id" = (SELECT id FROM "demographics_questions" WHERE "order_index" = 11) THEN 'dependents'
  WHEN "question_id" = (SELECT id FROM "demographics_questions" WHERE "order_index" = 12) THEN 'relationship_status'
  ELSE 'unknown'
END;

-- Step 3: Remove default values and make columns required
ALTER TABLE "demographics_answers" ALTER COLUMN "question_key" DROP DEFAULT;
ALTER TABLE "demographics_answers" ALTER COLUMN "updated_at" DROP DEFAULT;

-- Step 4: Drop foreign key constraint
ALTER TABLE "demographics_answers" DROP CONSTRAINT "demographics_answers_question_id_fkey";

-- Step 5: Drop old unique index
DROP INDEX "demographics_answers_user_id_question_id_key";

-- Step 6: Drop the old question_id column
ALTER TABLE "demographics_answers" DROP COLUMN "question_id";

-- Step 7: Drop the demographics_questions table
DROP TABLE "demographics_questions";

-- Step 8: Create new unique index
CREATE UNIQUE INDEX "demographics_answers_user_id_question_key_key" ON "demographics_answers"("user_id", "question_key");
