-- portfolio-assets bucket (Public)
-- INSERT: Allow individual insert
CREATE POLICY "Allow individual insert 1ls6mjs_0" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'portfolio-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- UPDATE: Allow individual update and delete
CREATE POLICY "Allow individual update and delete 1ls6mjs_0" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'portfolio-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE: Allow individual update and delete
CREATE POLICY "Allow individual update and delete 1ls6mjs_1" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'portfolio-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- monologue-recordings bucket (Public)
-- INSERT: Allow authenticated users to upload recordings
CREATE POLICY "Allow authenticated users to upload recordings" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'monologue-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- SELECT: Allow authenticated users to view their own recordings
CREATE POLICY "Allow authenticated users to view their own recordings" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'monologue-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- peer-training-recordings bucket (Public)
-- No policies created yet

-- Remove all other policies for these buckets to keep minimal and clean. 