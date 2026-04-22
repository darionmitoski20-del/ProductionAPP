-- Depends on: 20260329200000_order_status_add_pending_enum.sql (committed separately).
-- Manual kitchen flow: PENDING → ACCEPTED (approve) → PREPARING → READY.
-- Timestamps: accepted_at on approve, preparing_started_at only on PREPARING, ready_at on READY.

ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'PENDING'::public.order_status;

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

CREATE OR REPLACE FUNCTION public.cancel_customer_order(
  _order_id UUID,
  _phone TEXT,
  _customer_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_status TEXT;
  _stored_phone TEXT;
  _stored_name TEXT;
  _norm_input_phone TEXT := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
  _norm_stored_phone TEXT;
BEGIN
  IF _order_id IS NULL THEN
    RAISE EXCEPTION 'Order id is required';
  END IF;

  SELECT status::text, phone, customer_name
  INTO _current_status, _stored_phone, _stored_name
  FROM public.orders
  WHERE id = _order_id;

  IF _current_status IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  _norm_stored_phone := regexp_replace(coalesce(_stored_phone, ''), '\D', '', 'g');
  IF _norm_input_phone = '' OR _norm_input_phone <> _norm_stored_phone THEN
    RAISE EXCEPTION 'Not allowed to cancel this order';
  END IF;

  IF coalesce(trim(_customer_name), '') <> ''
     AND lower(trim(_customer_name)) <> lower(trim(coalesce(_stored_name, ''))) THEN
    RAISE EXCEPTION 'Not allowed to cancel this order';
  END IF;

  IF upper(_current_status) NOT IN ('PENDING', 'ACCEPTED') THEN
    RAISE EXCEPTION 'Already in preparation';
  END IF;

  UPDATE public.orders
  SET status = 'CANCELED'::public.order_status,
      canceled_at = now(),
      canceled_by_email = 'customer',
      updated_at = now()
  WHERE id = _order_id
    AND status::text IN ('PENDING', 'ACCEPTED');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Already in preparation';
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;
