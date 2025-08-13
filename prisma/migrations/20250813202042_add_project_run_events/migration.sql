-- CreateTable
CREATE TABLE "project_run_events" (
    "id" SERIAL NOT NULL,
    "run_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_run_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_run_events_run_id_id_idx" ON "project_run_events"("run_id", "id");

-- AddForeignKey
ALTER TABLE "project_run_events" ADD CONSTRAINT "project_run_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "project_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

