-- Create public bucket for app design assets (logo, hero image, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

-- Public read
CREATE POLICY "App assets are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'app-assets');

-- Authenticated users (admin) can upload
CREATE POLICY "Authenticated can upload app assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'app-assets');

-- Authenticated users (admin) can update
CREATE POLICY "Authenticated can update app assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'app-assets');

-- Authenticated users (admin) can delete
CREATE POLICY "Authenticated can delete app assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'app-assets');
