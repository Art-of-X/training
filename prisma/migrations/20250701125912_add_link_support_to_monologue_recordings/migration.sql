/*
  Warnings:

  - You are about to drop the column `file_description` on the `monologue_recordings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "monologue_recordings" DROP COLUMN "file_description",
ADD COLUMN     "supplementary_description" TEXT,
ADD COLUMN     "supplementary_link" TEXT;
