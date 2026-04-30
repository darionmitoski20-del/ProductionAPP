-- Repair: some projects never applied earlier migrations, so `cancel_order` / `update_order_status`
-- are missing and GRANT fails with "function ... does not exist".
-- Recreate the RPCs (same logic as 20260329200100), then grant EXECUTE so PostgREST exposes them (fixes PGRST202).
--
-- If `update_order_status` already exists with a different RETURNS type, PostgreSQL errors with 42P13;
-- DROP first (see hint from the server).
--
-- `cancel_order` / `update_order_status` call `is_staff_or_admin`; some DBs never had that migration.

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

DROP FUNCTION IF EXISTS public.update_order_status(uuid, text);
DROP FUNCTION IF EXISTS public.cancel_order(uuid, text, text);
DROP FUNCTION IF EXISTS public.cancel_order(uuid, text);

CREATE OR REPLACE FUNCTION public.update_order_status(_order_id UUID, _new_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _current TEXT;
  _caller_email TEXT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.is_staff_or_admin(_uid) THEN
    RAISE EXCEPTION 'Only admin or staff can update order status';
  END IF;

  SELECT email INTO _caller_email FROM auth.users WHERE id = _uid LIMIT 1;

  _new_status := upper(trim(_new_status));
  IF _new_status NOT IN ('ACCEPTED', 'PREPARING', 'READY') THEN
    RAISE EXCEPTION 'Allowed transitions: PENDING→ACCEPTED, ACCEPTED→PREPARING, PREPARING→READY. Use cancel_order for CANCELED.';
  END IF;

  SELECT status::text INTO _current FROM public.orders WHERE id = _order_id;
  IF _current IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  _current := upper(trim(_current));
  IF _current = _new_status THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF _new_status = 'ACCEPTED' AND _current <> 'PENDING' THEN
    RAISE EXCEPTION 'Only PENDING orders can be approved (current: %)', _current;
  END IF;
  IF _new_status = 'PREPARING' AND _current <> 'ACCEPTED' THEN
    RAISE EXCEPTION 'Only ACCEPTED orders can move to PREPARING (current: %)', _current;
  END IF;
  IF _new_status = 'READY' AND _current <> 'PREPARING' THEN
    RAISE EXCEPTION 'Only PREPARING orders can move to READY (current: %)', _current;
  END IF;

  IF _new_status = 'ACCEPTED' THEN
    UPDATE public.orders
    SET
      status = 'ACCEPTED'::public.order_status,
      accepted_at = now(),
      updated_at = now()
    WHERE id = _order_id;
  ELSIF _new_status = 'PREPARING' THEN
    UPDATE public.orders
    SET
      status = 'PREPARING'::public.order_status,
      accepted_at = COALESCE(accepted_at, now()),
      preparing_started_at = now(),
      updated_at = now()
    WHERE id = _order_id;
  ELSIF _new_status = 'READY' THEN
    UPDATE public.orders
    SET
      status = 'READY'::public.order_status,
      accepted_at = COALESCE(accepted_at, now()),
      ready_at = COALESCE(ready_at, now()),
      confirmed_by = _uid,
      confirmed_by_email = _caller_email,
      updated_at = now()
    WHERE id = _order_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

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
  SET status = 'CANCELED'::public.order_status,
      canceled_by = _uid,
      canceled_at = now(),
      canceled_by_email = _caller_email,
      updated_at = now()
  WHERE id = _order_id
    AND status::text IN ('PENDING', 'ACCEPTED', 'PREPARING');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or cannot be canceled (only PENDING/ACCEPTED/PREPARING can be canceled)';
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_order(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order(uuid, text, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, text) TO service_role;
