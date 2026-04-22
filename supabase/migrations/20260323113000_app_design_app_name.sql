-- Add configurable application/brand name for header logo text.
ALTER TABLE public.app_design_settings
  ADD COLUMN IF NOT EXISTS app_name text;

UPDATE public.app_design_settings
SET app_name = COALESCE(NULLIF(trim(app_name), ''), 'FastBite')
WHERE app_name IS NULL OR trim(app_name) = '';

ALTER TABLE public.app_design_settings
  ALTER COLUMN app_name SET DEFAULT 'FastBite';
