-- Persisted ETA + segmented progress fields for 3-step flow
-- ACCEPTED -> PREPARING -> READY

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preparing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_buffer_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS preparing_duration_minutes INTEGER;

-- Set defaults for new rows
ALTER TABLE public.orders
  ALTER COLUMN accepted_at SET DEFAULT now(),
  ALTER COLUMN accepted_buffer_minutes SET DEFAULT 5,
  ALTER COLUMN preparing_duration_minutes SET DEFAULT 15;

-- Backfill existing rows safely
UPDATE public.orders
SET
  accepted_at = COALESCE(accepted_at, confirmed_at, created_at),
  accepted_buffer_minutes = COALESCE(accepted_buffer_minutes, 5),
  preparing_duration_minutes = COALESCE(preparing_duration_minutes, 15);

