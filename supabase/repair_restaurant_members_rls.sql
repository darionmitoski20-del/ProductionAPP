-- Repair: "infinite recursion detected in policy for relation restaurant_members"
-- Run this entire script in Supabase Dashboard → SQL Editor (runs as postgres so the
-- SECURITY DEFINER function will bypass RLS). Then reload the app.

-- 1. Remove the policy that can cause recursion (stops 500s immediately)
DROP POLICY IF EXISTS "Members can read all members of their restaurant" ON public.restaurant_members;

-- 2. Recreate the helper function (as postgres owner it bypasses RLS when used in policies)
CREATE OR REPLACE FUNCTION public.current_user_restaurant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid();
$$;

-- Optional: set owner to postgres so SELECT inside the function bypasses RLS.
-- If you still see recursion, run in SQL Editor: ALTER FUNCTION public.current_user_restaurant_ids() OWNER TO postgres;

-- 3. Recreate the policy (now uses the function that bypasses RLS)
CREATE POLICY "Members can read all members of their restaurant"
ON public.restaurant_members FOR SELECT
TO authenticated
USING (restaurant_id IN (SELECT public.current_user_restaurant_ids()));

-- user_profiles policy is unchanged; it depends on this function and on reading
-- restaurant_members, which is now safe because current_user_restaurant_ids() bypasses RLS.
