/*
  Warnings:

  - You are about to drop the `aut_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monologue_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rat_questions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "aut_answers" DROP CONSTRAINT "aut_answers_question_id_fkey";

-- DropForeignKey
ALTER TABLE "monologue_recordings" DROP CONSTRAINT "monologue_recordings_question_id_fkey";

-- DropForeignKey
ALTER TABLE "rat_answers" DROP CONSTRAINT "rat_answers_question_id_fkey";

-- AlterTable
ALTER TABLE "monologue_recordings" ADD COLUMN     "text_response" TEXT,
ALTER COLUMN "audio_path" DROP NOT NULL;

-- DropTable
DROP TABLE "aut_questions";

-- DropTable
DROP TABLE "monologue_questions";

-- DropTable
DROP TABLE "rat_questions";

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_messages_userId_createdAt_idx" ON "chat_messages"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
