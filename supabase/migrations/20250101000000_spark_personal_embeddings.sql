-- Create function to match personal spark embeddings
CREATE OR REPLACE FUNCTION match_spark_personal_chunks(
  query_embedding vector(1536),
  spark_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE SQL STABLE
SECURITY DEFINER
AS $$
  SELECT
    se.id,
    se.content,
    se.metadata,
    (se.embedding <=> query_embedding) * -1 + 1 AS similarity
  FROM spark_embeddings se
  WHERE se.spark_id = match_spark_personal_chunks.spark_id
    AND se.embedding IS NOT NULL
  ORDER BY se.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create RLS policies for spark_embeddings
ALTER TABLE spark_embeddings ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can access all spark embeddings (application handles security)
CREATE POLICY "Service role can access all spark embeddings" ON spark_embeddings
  FOR ALL TO service_role USING (true);
