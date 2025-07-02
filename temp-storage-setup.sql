CREATE OR REPLACE FUNCTION apply_storage_policies() RETURNS void AS $$ BEGIN
-- Enable RLS on storage.objects table (should already be enabled)
-- Note: This is usually enabled by default in Supabase

-- Create policies for monologue-recordings bucket
-- Users can only access files in their own user folder

-- Policy: Users can insert their own files
CREATE POLICY IF NOT EXISTS "Users can upload monologue files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'monologue-recordings' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can select/view their own files  
CREATE POLICY IF NOT EXISTS "Users can view monologue files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'monologue-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY IF NOT EXISTS "Users can delete monologue files" ON storage.objects  
FOR DELETE USING (
  bucket_id = 'monologue-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files (for upserts)
CREATE POLICY IF NOT EXISTS "Users can update monologue files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'monologue-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policies for portfolio-assets bucket

-- Policy: Users can insert their own files
CREATE POLICY IF NOT EXISTS "Users can upload portfolio files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'portfolio-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can select/view their own files
CREATE POLICY IF NOT EXISTS "Users can view portfolio files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'portfolio-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY IF NOT EXISTS "Users can delete portfolio files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'portfolio-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files (for upserts)
CREATE POLICY IF NOT EXISTS "Users can update portfolio files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'portfolio-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create bucket policies (for bucket access)
-- These allow users to access the buckets themselves

-- Monologue recordings bucket access
CREATE POLICY IF NOT EXISTS "Give users access to monologue bucket" ON storage.buckets
FOR SELECT USING (id = 'monologue-recordings');

-- Portfolio assets bucket access  
CREATE POLICY IF NOT EXISTS "Give users access to portfolio bucket" ON storage.buckets
FOR SELECT USING (id = 'portfolio-assets');

-- Note: Public bucket policies (if you want files to be publicly accessible)
-- Uncomment these if you want public read access to files

/*
-- Public read access to monologue recordings
CREATE POLICY IF NOT EXISTS "Public read monologue files" ON storage.objects
FOR SELECT USING (bucket_id = 'monologue-recordings');

-- Public read access to portfolio assets
CREATE POLICY IF NOT EXISTS "Public read portfolio files" ON storage.objects  
FOR SELECT USING (bucket_id = 'portfolio-assets');
*/ ; END; $$ LANGUAGE plpgsql;
SELECT apply_storage_policies();
DROP FUNCTION apply_storage_policies();
