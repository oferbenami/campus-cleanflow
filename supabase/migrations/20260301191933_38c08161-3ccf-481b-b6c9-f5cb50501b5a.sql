
-- Create storage bucket for incident photos
INSERT INTO storage.buckets (id, name, public) VALUES ('incident-photos', 'incident-photos', true);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload incident photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'incident-photos' AND auth.uid() IS NOT NULL);

-- Allow public read
CREATE POLICY "Public read incident photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'incident-photos');

-- Allow uploader to delete their own photos
CREATE POLICY "Users delete own incident photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'incident-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
