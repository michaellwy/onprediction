-- Create storage bucket for forum images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'forum-images',
  'forum-images',
  true,
  2097152, -- 2MB limit (images are compressed client-side before upload)
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload forum images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'forum-images');

-- Allow public read access to forum images
CREATE POLICY "Public read access for forum images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'forum-images');

-- Allow users to delete their own uploads (path starts with their user_id)
CREATE POLICY "Users can delete their own forum images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'forum-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
