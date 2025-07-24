-- Make the monologue-recordings bucket public for read access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'monologue-recordings';

-- Make the portfolio-assets bucket public for read access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'portfolio-assets';

-- Make the uploads bucket public for read access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'uploads';

-- Show the current bucket status
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id IN ('monologue-recordings', 'portfolio-assets', 'uploads'); 