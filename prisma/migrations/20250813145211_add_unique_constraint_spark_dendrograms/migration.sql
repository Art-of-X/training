-- Add the unique constraint that was missing from the previous migration
-- Make it idempotent for shadow DB runs and replays
DO $$
DECLARE
  target_schema text := current_schema();
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'unique_spark_dendrogram'
      AND t.relname = 'spark_dendrograms'
      AND n.nspname = target_schema
  ) THEN
    ALTER TABLE "spark_dendrograms" ADD CONSTRAINT "unique_spark_dendrogram" UNIQUE ("spark_id");
  END IF;
END
$$;
