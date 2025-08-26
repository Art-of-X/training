-- DropForeignKey
ALTER TABLE "public"."output_comments" DROP CONSTRAINT "output_comments_output_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."output_comments" DROP CONSTRAINT "output_comments_user_id_fkey";

-- AlterTable
ALTER TABLE "public"."output_comments" ALTER COLUMN "id" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."vector_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "artist_name" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "embedding" vector,
    "content_hash" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vector_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vector_chunks_content_hash_key" ON "public"."vector_chunks"("content_hash");

-- CreateIndex
CREATE INDEX "idx_vector_chunks_artist_name" ON "public"."vector_chunks"("artist_name");

-- CreateIndex
CREATE INDEX "idx_vector_chunks_embedding" ON "public"."vector_chunks"("embedding");

-- AddForeignKey
ALTER TABLE "public"."output_comments" ADD CONSTRAINT "output_comments_output_id_fkey" FOREIGN KEY ("output_id") REFERENCES "public"."outputs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
