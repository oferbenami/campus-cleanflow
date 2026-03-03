
-- Make incident-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'incident-photos';

-- Drop the public read policy
DROP POLICY IF EXISTS "Public read incident photos" ON storage.objects;

-- Create authenticated read policy (all authenticated users can view)
CREATE POLICY "Authenticated read incident photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'incident-photos' AND auth.uid() IS NOT NULL
);
