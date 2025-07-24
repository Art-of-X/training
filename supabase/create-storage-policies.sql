-- portfolio-assets bucket (Public)
-- INSERT: Allow individual insert
DROP POLICY IF EXISTS "Allow individual insert 1ls6mjs_0" ON storage.objects;
CREATE POLICY "Allow individual insert 1ls6mjs_0" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'portfolio-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- UPDATE: Allow individual update and delete
DROP POLICY IF EXISTS "Allow individual update and delete 1ls6mjs_0" ON storage.objects;
CREATE POLICY "Allow individual update and delete 1ls6mjs_0" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'portfolio-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE: Allow individual update and delete
DROP POLICY IF EXISTS "Allow individual update and delete 1ls6mjs_1" ON storage.objects;
CREATE POLICY "Allow individual update and delete 1ls6mjs_1" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'portfolio-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- monologue-recordings bucket (Public)
-- INSERT: Allow authenticated users to upload recordings
DROP POLICY IF EXISTS "Allow authenticated users to upload recordings" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload recordings" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'monologue-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- SELECT: Allow authenticated users to view their own recordings
DROP POLICY IF EXISTS "Allow authenticated users to view their own recordings" ON storage.objects;
CREATE POLICY "Allow authenticated users to view their own recordings" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'monologue-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- peer-training-recordings bucket (Public)
-- No policies created yet

-- uploads bucket (Public)
-- SELECT: Public Read Access
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access" ON storage.objects
FOR SELECT TO public
USING (
  bucket_id = 'uploads'
);

-- INSERT: Authenticated user can upload to temp
DROP POLICY IF EXISTS "Authenticated user can upload to temp" ON storage.objects;
CREATE POLICY "Authenticated user can upload to temp" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  path_tokens[1] = 'temp' AND
  path_tokens[2] = auth.uid()::text
);

-- INSERT: Users can insert into their own folders (portfolio, monologue)
DROP POLICY IF EXISTS "Users can insert into their own folders" ON storage.objects;
CREATE POLICY "Users can insert into their own folders" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  path_tokens[2] = auth.uid()::text AND
  (path_tokens[1] = 'portfolio' OR path_tokens[1] = 'monologue')
);

-- DELETE: Users can delete their own files (portfolio, monologue, temp)
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'uploads' AND
  path_tokens[2] = auth.uid()::text AND
  (path_tokens[1] = 'portfolio' OR path_tokens[1] = 'monologue' OR path_tokens[1] = 'temp')
);

-- Remove all other policies for uploads to keep minimal and clean. 