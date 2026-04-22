-- Repair: allow checkout to insert order_items for newly created orders.
-- Run this in Supabase Dashboard -> SQL Editor if order creation succeeds
-- but order_items insert fails with:
--   new row violates row-level security policy for table "order_items"

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
      AND p.restaurant_id = o.restaurant_id
  );
$$;

-- Optional: if needed, run this separately in SQL Editor:
-- ALTER FUNCTION public.can_insert_order_item(uuid, uuid) OWNER TO postgres;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert order items for valid orders" ON public.order_items;
CREATE POLICY "Anyone can insert order items for valid orders"
ON public.order_items FOR INSERT
TO anon, authenticated
WITH CHECK (public.can_insert_order_item(order_id, product_id));
