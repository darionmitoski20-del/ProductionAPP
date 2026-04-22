-- Remove the enum overload of update_order_status so only the TEXT version exists.
-- Fixes: "Could not choose the best candidate function between
--   public.update_order_status(_order_id => uuid, _new_status => public.order_status),
--   public.update_order_status(_order_id => uuid, _new_status => text)"

DROP FUNCTION IF EXISTS public.update_order_status(UUID, public.order_status);
