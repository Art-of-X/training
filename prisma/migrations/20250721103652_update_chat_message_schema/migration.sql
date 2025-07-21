/*
  Warnings:

  - Added the required column `updatedAt` to the `chat_messages` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
