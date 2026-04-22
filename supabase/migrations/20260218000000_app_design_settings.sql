-- App design settings (singleton row)
CREATE TABLE IF NOT EXISTS public.app_design_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url text,
  hero_background_type text NOT NULL DEFAULT 'gradient' CHECK (hero_background_type IN ('gradient', 'solid', 'image')),
  hero_gradient_from text NOT NULL DEFAULT '#f97316',
  hero_gradient_to text NOT NULL DEFAULT '#ef4444',
  hero_solid_color text NOT NULL DEFAULT '#f97316',
  hero_image_url text,
  primary_color text NOT NULL DEFAULT '#16a34a',
  secondary_color text NOT NULL DEFAULT '#f97316',
  font_family text NOT NULL DEFAULT 'Inter',
  button_radius text NOT NULL DEFAULT 'rounded-xl' CHECK (button_radius IN ('rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_design_settings ENABLE ROW LEVEL SECURITY;

-- Public read (anon + authenticated)
DROP POLICY IF EXISTS "app_design_settings_select_public" ON public.app_design_settings;
CREATE POLICY "app_design_settings_select_public"
ON public.app_design_settings FOR SELECT TO public USING (true);

-- Authenticated: update only (singleton: update the single row)
DROP POLICY IF EXISTS "app_design_settings_update_authenticated" ON public.app_design_settings;
CREATE POLICY "app_design_settings_update_authenticated"
ON public.app_design_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Authenticated: allow insert only for first row (application will insert once)
DROP POLICY IF EXISTS "app_design_settings_insert_authenticated" ON public.app_design_settings;
CREATE POLICY "app_design_settings_insert_authenticated"
ON public.app_design_settings FOR INSERT TO authenticated WITH CHECK (true);

-- Insert singleton default row (only if table is empty)
INSERT INTO public.app_design_settings (id, logo_url, hero_background_type, hero_gradient_from, hero_gradient_to, hero_solid_color, hero_image_url, primary_color, secondary_color, font_family, button_radius)
SELECT gen_random_uuid(), NULL, 'gradient', '#f97316', '#ef4444', '#f97316', NULL, '#16a34a', '#f97316', 'Inter', 'rounded-xl'
WHERE NOT EXISTS (SELECT 1 FROM public.app_design_settings LIMIT 1);

-- Storage: app-assets public bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

-- Public read for app-assets
DROP POLICY IF EXISTS "app_assets_select_public" ON storage.objects;
CREATE POLICY "app_assets_select_public"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'app-assets');

-- Authenticated write for app-assets
DROP POLICY IF EXISTS "app_assets_insert_authenticated" ON storage.objects;
CREATE POLICY "app_assets_insert_authenticated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'app-assets');

DROP POLICY IF EXISTS "app_assets_update_authenticated" ON storage.objects;
CREATE POLICY "app_assets_update_authenticated"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'app-assets');

DROP POLICY IF EXISTS "app_assets_delete_authenticated" ON storage.objects;
CREATE POLICY "app_assets_delete_authenticated"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'app-assets');
