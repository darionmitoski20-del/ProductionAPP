-- Create public bucket for product images (read: public, write: authenticated)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

-- Public read (public bucket already allows read; explicit policy for clarity)
CREATE POLICY "Product images are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Authenticated users (admin UI) can upload/update/delete
CREATE POLICY "Authenticated can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
