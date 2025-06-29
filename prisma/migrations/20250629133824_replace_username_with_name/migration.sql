/*
  Warnings:

  - You are about to drop the column `username` on the `user_profiles` table. All the data in the column will be lost.
  - Added the required column `name` to the `user_profiles` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "user_profiles_username_key";

-- AlterTable
ALTER TABLE "user_profiles" DROP COLUMN "username",
ADD COLUMN     "name" TEXT NOT NULL;
