-- Change ETA defaults from 5/15 (20min) to 3/12 (15min total)

ALTER TABLE public.orders
  ALTER COLUMN accepted_buffer_minutes SET DEFAULT 3,
  ALTER COLUMN preparing_duration_minutes SET DEFAULT 12;

-- Backfill existing orders still using old defaults or NULL
UPDATE public.orders
SET
  accepted_buffer_minutes = 3,
  preparing_duration_minutes = 12
WHERE
  accepted_buffer_minutes IS NULL
  OR accepted_buffer_minutes = 5
  OR preparing_duration_minutes IS NULL
  OR preparing_duration_minutes = 15;
