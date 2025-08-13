-- AlterTable
ALTER TABLE "patterns" ADD COLUMN "spark_id" UUID;

-- AlterTable
ALTER TABLE "patterns" ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "idx_patterns_spark_id" ON "patterns"("spark_id");

-- AddForeignKey
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_spark_id_fkey" FOREIGN KEY ("spark_id") REFERENCES "sparks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddConstraint
ALTER TABLE "patterns" ADD CONSTRAINT "check_user_or_spark" CHECK ("user_id" IS NOT NULL OR "spark_id" IS NOT NULL);
