-- Per-restaurant order details copy (pickup title/timing) on app_design_settings
ALTER TABLE public.app_design_settings
  ADD COLUMN IF NOT EXISTS pickup_title text,
  ADD COLUMN IF NOT EXISTS pickup_timing_text text;

COMMENT ON COLUMN public.app_design_settings.pickup_title IS 'Order details pickup title (per restaurant).';
COMMENT ON COLUMN public.app_design_settings.pickup_timing_text IS 'Order details pickup timing text (per restaurant).';

