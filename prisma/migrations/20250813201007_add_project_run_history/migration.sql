-- AlterTable
ALTER TABLE "outputs" ADD COLUMN     "run_id" UUID;

-- CreateTable
CREATE TABLE "project_runs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "summary" TEXT,

    CONSTRAINT "project_runs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "outputs" ADD CONSTRAINT "outputs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "project_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_runs" ADD CONSTRAINT "project_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_runs" ADD CONSTRAINT "project_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "unique_spark_dendrogram" RENAME TO "spark_dendrograms_spark_id_key";

