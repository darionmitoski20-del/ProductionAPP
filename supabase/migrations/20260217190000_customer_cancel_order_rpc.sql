-- Customer cancel RPC for order tracking page.
-- Safe rule set:
-- 1) Owner-equivalent check using the phone used for the order.
-- 2) Cancel allowed only while status is ACCEPTED.
-- 3) Clear error messages for invalid state.

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

  IF upper(_current_status) <> 'ACCEPTED' THEN
    RAISE EXCEPTION 'Already in preparation';
  END IF;

  UPDATE public.orders
  SET status = 'CANCELED',
      canceled_at = now(),
      canceled_by_email = 'customer',
      updated_at = now()
  WHERE id = _order_id
    AND status::text = 'ACCEPTED';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Already in preparation';
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_customer_order(UUID, TEXT, TEXT) TO anon, authenticated;

