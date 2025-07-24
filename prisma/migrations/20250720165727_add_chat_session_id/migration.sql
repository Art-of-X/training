/*
  Warnings:

  - You are about to drop the column `created_at` on the `chat_messages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "chat_messages" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "chat_messages_userId_createdAt_idx" ON "chat_messages"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_idx" ON "chat_messages"("session_id");
