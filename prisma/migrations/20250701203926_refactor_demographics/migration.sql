/*
  Warnings:

  - Made the column `question_key` on table `demographics_answers` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `demographics_answers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "demographics_answers" ALTER COLUMN "question_key" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;
