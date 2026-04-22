-- Allow checkout to insert order_items after creating an order.
-- The policy must verify the parent order/product relationship without being
-- blocked by RLS on orders/products, so we use a SECURITY DEFINER helper.

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

DO $$
BEGIN
  ALTER FUNCTION public.can_insert_order_item(uuid, uuid) OWNER TO postgres;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert order items for valid orders" ON public.order_items;
CREATE POLICY "Anyone can insert order items for valid orders"
ON public.order_items FOR INSERT
TO anon, authenticated
WITH CHECK (public.can_insert_order_item(order_id, product_id));
