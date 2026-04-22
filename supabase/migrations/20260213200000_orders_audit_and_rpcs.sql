-- Order audit: who confirmed (accepted) / who canceled
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by_email TEXT,
  ADD COLUMN IF NOT EXISTS canceled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_by_email TEXT;

-- RPC: confirm order (NEW -> ACCEPTED), sets confirmed_by/confirmed_at (caller_email optional for display)
CREATE OR REPLACE FUNCTION public.confirm_order(_order_id UUID, _caller_email TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'staff')) THEN
    RAISE EXCEPTION 'Only admin or staff can confirm orders';
  END IF;
  UPDATE public.orders
  SET status = 'ACCEPTED',
      confirmed_by = _uid,
      confirmed_at = now(),
      confirmed_by_email = _caller_email,
      updated_at = now()
  WHERE id = _order_id AND status = 'NEW';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or not in NEW status';
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RPC: cancel order, sets canceled_by/canceled_at (caller_email optional for display)
CREATE OR REPLACE FUNCTION public.cancel_order(_order_id UUID, _reason TEXT DEFAULT NULL, _caller_email TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'staff')) THEN
    RAISE EXCEPTION 'Only admin or staff can cancel orders';
  END IF;
  UPDATE public.orders
  SET status = 'CANCELED',
      canceled_by = _uid,
      canceled_at = now(),
      canceled_by_email = _caller_email,
      updated_at = now()
  WHERE id = _order_id
    AND status NOT IN ('COMPLETED', 'CANCELED');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or already completed/canceled';
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RPC: update order status (for ACCEPTED->PREPARING, PREPARING->READY, READY->COMPLETED)
CREATE OR REPLACE FUNCTION public.update_order_status(_order_id UUID, _new_status public.order_status)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'staff')) THEN
    RAISE EXCEPTION 'Only admin or staff can update order status';
  END IF;
  IF _new_status NOT IN ('ACCEPTED', 'PREPARING', 'READY', 'COMPLETED') THEN
    RAISE EXCEPTION 'Use confirm_order or cancel_order for NEW/CANCELED';
  END IF;
  UPDATE public.orders
  SET status = _new_status,
      updated_at = now()
  WHERE id = _order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Remove direct UPDATE on orders so only RPCs can change status (audit trail)
DROP POLICY IF EXISTS "Staff and admins can update orders" ON public.orders;
