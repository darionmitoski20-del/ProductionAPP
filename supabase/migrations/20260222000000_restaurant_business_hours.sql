-- Business hours per restaurant, per day of week.
-- day_of_week: 0 = Sunday, 1 = Monday, ... 6 = Saturday (matches JavaScript Date.getDay()).
-- Times are stored as time without time zone; interpret in restaurant's timezone.

CREATE TABLE IF NOT EXISTS public.restaurant_business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_open boolean NOT NULL DEFAULT true,
  open_time time,
  close_time time,
  break_start time,
  break_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_business_hours_restaurant_id
  ON public.restaurant_business_hours(restaurant_id);

-- Validation: when is_open, open_time and close_time required; close > open; break inside open/close; break_end > break_start
ALTER TABLE public.restaurant_business_hours
  ADD CONSTRAINT chk_open_times
  CHECK (
    (NOT is_open AND open_time IS NULL AND close_time IS NULL AND break_start IS NULL AND break_end IS NULL)
    OR
    (is_open AND open_time IS NOT NULL AND close_time IS NOT NULL AND close_time > open_time
     AND (break_start IS NULL AND break_end IS NULL OR (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start
          AND break_start >= open_time AND break_end <= close_time)))
  );

ALTER TABLE public.restaurant_business_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can manage business hours of their restaurant" ON public.restaurant_business_hours;
CREATE POLICY "Members can manage business hours of their restaurant"
ON public.restaurant_business_hours FOR ALL
TO authenticated
USING (restaurant_id IN (SELECT public.current_user_restaurant_ids()))
WITH CHECK (restaurant_id IN (SELECT public.current_user_restaurant_ids()));

-- Public read for customer menu (check if open)
DROP POLICY IF EXISTS "Public can read business hours" ON public.restaurant_business_hours;
CREATE POLICY "Public can read business hours"
ON public.restaurant_business_hours FOR SELECT
TO anon, authenticated
USING (true);

-- Optional: restaurant timezone for correct open/closed calculation (default UTC if not set)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE public.restaurants ADD COLUMN timezone text DEFAULT 'UTC';
  END IF;
END $$;

COMMENT ON TABLE public.restaurant_business_hours IS 'Per-day business hours per restaurant. day_of_week 0=Sun..6=Sat. Times in restaurant local time.';
