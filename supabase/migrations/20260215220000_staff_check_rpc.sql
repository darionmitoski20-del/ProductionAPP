-- Ensure staff/admin are recognized in order RPCs: use direct table check (user_profiles + user_roles)
-- so "Only admin or staff can update/cancel" 400s go away for valid staff accounts.

CREATE OR REPLACE FUNCTION public.is_staff_or_admin(_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = _uid AND role IN ('ADMIN', 'STAFF'))
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role IN ('admin', 'staff'));
$$;

-- Recreate update_order_status to use is_staff_or_admin (keep rest of logic the same)
CREATE OR REPLACE FUNCTION public.update_order_status(_order_id UUID, _new_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _current TEXT;
  _new_enum public.order_status;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_staff_or_admin(_uid) THEN
    RAISE EXCEPTION 'Only admin or staff can update order status';
  END IF;

  _new_status := upper(trim(_new_status));
  IF _new_status NOT IN ('PREPARING', 'READY') THEN
    RAISE EXCEPTION 'Allowed transitions: ACCEPTED→PREPARING, PREPARING→READY. Use cancel_order for CANCELED.';
  END IF;

  SELECT status::text INTO _current FROM public.orders WHERE id = _order_id;
  IF _current IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  _current := upper(trim(_current));
  IF _current = _new_status THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF _new_status = 'PREPARING' AND _current NOT IN ('ACCEPTED', 'NEW') THEN
    RAISE EXCEPTION 'Only ACCEPTED orders can move to PREPARING (current: %)', _current;
  END IF;
  IF _new_status = 'READY' AND _current <> 'PREPARING' THEN
    RAISE EXCEPTION 'Only PREPARING orders can move to READY (current: %)', _current;
  END IF;

  _new_enum := _new_status::public.order_status;
  UPDATE public.orders
  SET status = _new_enum,
      updated_at = now()
  WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Recreate cancel_order to use is_staff_or_admin
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
  IF NOT public.is_staff_or_admin(_uid) THEN
    RAISE EXCEPTION 'Only admin or staff can cancel orders';
  END IF;
  UPDATE public.orders
  SET status = 'CANCELED',
      canceled_by = _uid,
      canceled_at = now(),
      canceled_by_email = _caller_email,
      updated_at = now()
  WHERE id = _order_id
    AND status::text IN ('ACCEPTED', 'PREPARING', 'NEW');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or cannot be canceled (only ACCEPTED/PREPARING can be canceled)';
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
