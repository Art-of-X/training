-- Create the main bucket for file uploads if it doesn't exist.
-- Set to public so we can use public URLs. RLS policies will still control access.
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for the 'uploads' bucket.

-- 1. Allow public read access to all files.
-- The application relies on public URLs, so this is necessary.
-- Sensitive files should not be uploaded here, or a different bucket/policy setup is needed.
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'uploads');

-- 2. Allow authenticated users to upload files into their own 'temp' folder.
-- The path will be like 'temp/{user_id}/{uuid}'
DROP POLICY IF EXISTS "Authenticated user can upload to temp" ON storage.objects;
CREATE POLICY "Authenticated user can upload to temp"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'uploads' AND
        path_tokens[1] = 'temp' AND
        path_tokens[2] = auth.uid()::text
    );

-- 3. Allow authenticated users to move files by allowing inserts into their own portfolio/monologue folders.
-- The server-side 'finalize' tool will copy from temp to the final destination, which is an INSERT.
DROP POLICY IF EXISTS "Users can insert into their own folders" ON storage.objects;
CREATE POLICY "Users can insert into their own folders"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'uploads' AND
        path_tokens[2] = auth.uid()::text AND
        (path_tokens[1] = 'portfolio' OR path_tokens[1] = 'monologue')
    );

-- 4. Allow authenticated users to delete their own files from portfolio, monologue, or temp folders.
-- The server-side 'finalize' tool will delete files from temp after copying.
-- Users can also delete their own portfolio/monologue items via the UI, which calls a backend endpoint.
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'uploads' AND
        path_tokens[2] = auth.uid()::text AND
        (path_tokens[1] = 'portfolio' OR path_tokens[1] = 'monologue' OR path_tokens[1] = 'temp')
    ); 