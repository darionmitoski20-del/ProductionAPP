-- Recreate RPC with jsonb return type.
-- Existing projects may already have delete_category_uncategorize(uuid)
-- with a different return type, so we must drop first.
DROP FUNCTION IF EXISTS public.delete_category_uncategorize(uuid);

CREATE FUNCTION public.delete_category_uncategorize(p_category_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  moved_count int;
BEGIN
  UPDATE products
  SET category_id = null, category = null
  WHERE category_id = p_category_id;
  GET DIAGNOSTICS moved_count = ROW_COUNT;

  DELETE FROM menu_categories WHERE id = p_category_id;

  RETURN jsonb_build_object('moved_count', moved_count, 'deleted', true);
END;
$$;

COMMENT ON FUNCTION public.delete_category_uncategorize(uuid) IS
  'Uncategorize all products in the category then delete the category. Returns { moved_count, deleted }.';

GRANT EXECUTE ON FUNCTION public.delete_category_uncategorize(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_category_uncategorize(uuid) TO service_role;
