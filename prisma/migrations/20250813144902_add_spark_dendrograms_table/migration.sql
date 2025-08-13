-- CreateTable
CREATE TABLE "spark_dendrograms" (
    "id" UUID NOT NULL,
    "spark_id" UUID NOT NULL,
    "dendrogram_svg" TEXT NOT NULL,
    "dendrogram_png" BYTEA,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spark_dendrograms_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "spark_dendrograms" ADD CONSTRAINT "spark_dendrograms_spark_id_fkey" FOREIGN KEY ("spark_id") REFERENCES "sparks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add the unique constraint that was missing
ALTER TABLE "spark_dendrograms" ADD CONSTRAINT "unique_spark_dendrogram" UNIQUE ("spark_id");
