-- Fix update_order_status and cancel_order to avoid 400s:
-- 1) Accept TEXT for status and cast explicitly (avoids client/server enum mismatch).
-- 2) Idempotent: if order already in target status, return ok.
-- 3) Staff/admin check: use both has_role() and direct user_profiles lookup so staff is always recognized.
-- Run after 20260215200000_order_status_three_steps.sql (or if that wasn't run, this will fail until it is).

-- Helper: true if caller is admin or staff (user_profiles or user_roles)
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

-- update_order_status: allow only ACCEPTED→PREPARING, PREPARING→READY; idempotent
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
  -- Idempotent: already in target status
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

-- cancel_order: only from ACCEPTED or PREPARING; accept optional TEXT for consistency
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
