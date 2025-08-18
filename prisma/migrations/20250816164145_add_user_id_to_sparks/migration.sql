-- AlterTable
ALTER TABLE "sparks" ADD COLUMN "user_id" UUID;

-- AddForeignKey
ALTER TABLE "sparks" ADD CONSTRAINT "sparks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE SET NULL;
