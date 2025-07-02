-- Make the monologue-recordings bucket public for read access
-- This allows HTML5 audio elements to play files directly

-- First, update the bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'monologue-recordings';

-- The existing RLS policies will still control who can upload/delete
-- But now anyone can read/view files via public URLs

-- Let's also check portfolio bucket and make it public too for consistency
UPDATE storage.buckets 
SET public = true 
WHERE id = 'portfolio-assets';

-- Show the current bucket status
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id IN ('monologue-recordings', 'portfolio-assets'); 