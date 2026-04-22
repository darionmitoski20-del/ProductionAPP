-- Ensure PREPARING/READY transitions persist ETA timestamps.

CREATE OR REPLACE FUNCTION public.update_order_status(_order_id UUID, _new_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _current TEXT;
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
  -- Idempotent
  IF _current = _new_status THEN
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF _new_status = 'PREPARING' AND _current NOT IN ('ACCEPTED') THEN
    RAISE EXCEPTION 'Only ACCEPTED orders can move to PREPARING (current: %)', _current;
  END IF;
  IF _new_status = 'READY' AND _current <> 'PREPARING' THEN
    RAISE EXCEPTION 'Only PREPARING orders can move to READY (current: %)', _current;
  END IF;

  IF _new_status = 'PREPARING' THEN
    UPDATE public.orders
    SET
      status = 'PREPARING'::public.order_status,
      accepted_at = COALESCE(accepted_at, confirmed_at, created_at),
      preparing_started_at = COALESCE(preparing_started_at, now()),
      updated_at = now()
    WHERE id = _order_id;
  ELSIF _new_status = 'READY' THEN
    UPDATE public.orders
    SET
      status = 'READY'::public.order_status,
      accepted_at = COALESCE(accepted_at, confirmed_at, created_at),
      preparing_started_at = COALESCE(preparing_started_at, updated_at, accepted_at, created_at),
      ready_at = COALESCE(ready_at, now()),
      updated_at = now()
    WHERE id = _order_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

