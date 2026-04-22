-- Idempotent repair: some databases never applied 20260217201000_orders_eta_segments.sql.
-- Code + update_order_status RPC expect these columns (ready_at, accepted_at, preparing_started_at).
-- TIMESTAMPTZ matches Supabase/JS ISO strings and existing generated types.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preparing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_buffer_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS preparing_duration_minutes INTEGER;

-- Align defaults with 20260217210000_eta_defaults_3_12 (safe if columns pre-existed).
ALTER TABLE public.orders
  ALTER COLUMN accepted_at SET DEFAULT now(),
  ALTER COLUMN accepted_buffer_minutes SET DEFAULT 3,
  ALTER COLUMN preparing_duration_minutes SET DEFAULT 12;

UPDATE public.orders
SET
  accepted_at = COALESCE(accepted_at, confirmed_at, created_at),
  accepted_buffer_minutes = COALESCE(accepted_buffer_minutes, 3),
  preparing_duration_minutes = COALESCE(preparing_duration_minutes, 12)
WHERE
  accepted_at IS NULL
  OR accepted_buffer_minutes IS NULL
  OR preparing_duration_minutes IS NULL;
