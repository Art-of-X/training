-- Add the unique constraint that was missing from the previous migration
-- Make it idempotent for shadow DB runs and replays
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'unique_spark_dendrogram'
      AND n.nspname = 'public'
  ) THEN
    ALTER TABLE "spark_dendrograms" ADD CONSTRAINT "unique_spark_dendrogram" UNIQUE ("spark_id");
  END IF;
END
$$;
