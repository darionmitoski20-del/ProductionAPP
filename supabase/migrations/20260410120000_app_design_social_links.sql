-- Public menu footer: optional Facebook and Instagram profile URLs (set in Admin → Design).
ALTER TABLE public.app_design_settings
  ADD COLUMN IF NOT EXISTS social_facebook_url text,
  ADD COLUMN IF NOT EXISTS social_instagram_url text;

COMMENT ON COLUMN public.app_design_settings.social_facebook_url IS 'Full URL to Facebook page (public menu footer).';
COMMENT ON COLUMN public.app_design_settings.social_instagram_url IS 'Full URL to Instagram profile (public menu footer).';
