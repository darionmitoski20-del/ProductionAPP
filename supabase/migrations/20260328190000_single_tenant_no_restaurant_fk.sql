-- Single-tenant: business hours no longer reference public.restaurants.
-- Order item RLS no longer matches on restaurant_id between orders and products.

-- 1) App-wide timezone (replaces restaurants.timezone for open/closed logic)
ALTER TABLE public.app_design_settings
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Skopje';

-- 2) restaurant_business_hours: drop FK, collapse to one schedule (restaurant_id NULL)
ALTER TABLE public.restaurant_business_hours
  DROP CONSTRAINT IF EXISTS restaurant_business_hours_restaurant_id_fkey;

-- Keep a single row per day_of_week (oldest id wins)
DELETE FROM public.restaurant_business_hours rbh
WHERE rbh.id NOT IN (
  SELECT DISTINCT ON (day_of_week) id
  FROM public.restaurant_business_hours
  ORDER BY day_of_week, created_at ASC NULLS LAST, id ASC
);

ALTER TABLE public.restaurant_business_hours
  DROP CONSTRAINT IF EXISTS restaurant_business_hours_restaurant_id_day_of_week_key;

ALTER TABLE public.restaurant_business_hours
  ALTER COLUMN restaurant_id DROP NOT NULL;

UPDATE public.restaurant_business_hours SET restaurant_id = NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_business_hours_singleton_day
  ON public.restaurant_business_hours (day_of_week)
  WHERE restaurant_id IS NULL;

DROP POLICY IF EXISTS "Members can manage business hours of their restaurant" ON public.restaurant_business_hours;
CREATE POLICY "Staff and admin manage business hours"
ON public.restaurant_business_hours FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('ADMIN', 'STAFF')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('ADMIN', 'STAFF')
  )
  AND restaurant_id IS NULL
);

-- 3) Checkout: allow order_items when order + product exist (no restaurant pairing)
CREATE OR REPLACE FUNCTION public.can_insert_order_item(_order_id uuid, _product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.products p ON p.id = _product_id
    WHERE o.id = _order_id
  );
$$;

DO $$
BEGIN
  ALTER FUNCTION public.can_insert_order_item(uuid, uuid) OWNER TO postgres;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 4) Optional: relax orders/order_items.restaurant_id if present (legacy SaaS columns)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'restaurant_id'
  ) THEN
    ALTER TABLE public.orders ALTER COLUMN restaurant_id DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'restaurant_id'
  ) THEN
    ALTER TABLE public.order_items ALTER COLUMN restaurant_id DROP NOT NULL;
  END IF;
END $$;
