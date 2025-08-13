-- CreateTable
CREATE TABLE "patterns" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "message_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "competency" TEXT NOT NULL,
    "spark" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_predefined" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sparks" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sparks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_items" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "description" TEXT,
    "link" TEXT,
    "file_path" TEXT,
    "text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sparks_on_projects" (
    "project_id" UUID NOT NULL,
    "spark_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sparks_on_projects_pkey" PRIMARY KEY ("project_id","spark_id")
);

-- CreateTable
CREATE TABLE "outputs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "spark_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outputs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_items" ADD CONSTRAINT "context_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sparks_on_projects" ADD CONSTRAINT "sparks_on_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sparks_on_projects" ADD CONSTRAINT "sparks_on_projects_spark_id_fkey" FOREIGN KEY ("spark_id") REFERENCES "sparks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outputs" ADD CONSTRAINT "outputs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outputs" ADD CONSTRAINT "outputs_spark_id_fkey" FOREIGN KEY ("spark_id") REFERENCES "sparks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
