-- Refactor order status to exactly 3 steps: ACCEPTED → PREPARING → READY (+ CANCELED).
-- Remove NEW, COMPLETED; new orders default to ACCEPTED.

-- 1) Create new enum with 4 values only
CREATE TYPE public.order_status_new AS ENUM ('ACCEPTED', 'PREPARING', 'READY', 'CANCELED');

-- 2) Add temporary column and migrate data
ALTER TABLE public.orders ADD COLUMN status_new public.order_status_new;

UPDATE public.orders
SET status_new = CASE status::text
  WHEN 'NEW' THEN 'ACCEPTED'::public.order_status_new
  WHEN 'COMPLETED' THEN 'READY'::public.order_status_new
  ELSE status::text::public.order_status_new
END;

ALTER TABLE public.orders ALTER COLUMN status_new SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN status_new SET DEFAULT 'ACCEPTED'::public.order_status_new;

-- 3) Drop old column and rename new
ALTER TABLE public.orders DROP COLUMN status;
ALTER TABLE public.orders RENAME COLUMN status_new TO status;

-- 4) Replace enum type (drop old, rename new)
ALTER TYPE public.order_status RENAME TO order_status_old;
ALTER TYPE public.order_status_new RENAME TO order_status;

-- 5) Drop confirm_order (no longer needed; new orders start as ACCEPTED)
DROP FUNCTION IF EXISTS public.confirm_order(UUID, TEXT);

-- 6) cancel_order: only from ACCEPTED or PREPARING (not READY)
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
    AND status IN ('ACCEPTED', 'PREPARING');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found or cannot be canceled (only ACCEPTED/PREPARING can be canceled)';
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 7) update_order_status: only allow ACCEPTED→PREPARING, PREPARING→READY
CREATE OR REPLACE FUNCTION public.update_order_status(_order_id UUID, _new_status public.order_status)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _current public.order_status;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.has_role(_uid, 'admin') OR public.has_role(_uid, 'staff')) THEN
    RAISE EXCEPTION 'Only admin or staff can update order status';
  END IF;
  IF _new_status NOT IN ('PREPARING', 'READY') THEN
    RAISE EXCEPTION 'Allowed transitions: ACCEPTED→PREPARING, PREPARING→READY. Use cancel_order for CANCELED.';
  END IF;

  SELECT status INTO _current FROM public.orders WHERE id = _order_id;
  IF _current IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF _new_status = 'PREPARING' AND _current <> 'ACCEPTED' THEN
    RAISE EXCEPTION 'Only ACCEPTED orders can move to PREPARING';
  END IF;
  IF _new_status = 'READY' AND _current <> 'PREPARING' THEN
    RAISE EXCEPTION 'Only PREPARING orders can move to READY';
  END IF;

  UPDATE public.orders
  SET status = _new_status,
      updated_at = now()
  WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 8) Drop old enum
DROP TYPE public.order_status_old;
