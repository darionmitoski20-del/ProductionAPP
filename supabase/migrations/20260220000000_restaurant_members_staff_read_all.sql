-- Allow any restaurant member to read ALL members of their restaurant (so Staff page shows admins + staff).
-- Use a SECURITY DEFINER function to avoid infinite recursion: the policy must not SELECT from
-- restaurant_members itself (that would re-trigger RLS on the same table).
-- If you see "infinite recursion detected in policy for relation restaurant_members", run
-- supabase/repair_restaurant_members_rls.sql in Supabase Dashboard → SQL Editor (as postgres).

CREATE OR REPLACE FUNCTION public.current_user_restaurant_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.restaurant_members WHERE user_id = auth.uid();
$$;

-- Prefer postgres owner so the function's inner SELECT bypasses RLS (avoids recursion)
DO $$
BEGIN
  ALTER FUNCTION public.current_user_restaurant_ids() OWNER TO postgres;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read all members of their restaurant" ON public.restaurant_members;
CREATE POLICY "Members can read all members of their restaurant"
ON public.restaurant_members FOR SELECT
TO authenticated
USING (restaurant_id IN (SELECT public.current_user_restaurant_ids()));

-- Allow reading user_profiles for users who are in the same restaurant(s) as the current user.
-- Uses the same helper so we don't query restaurant_members under RLS from within a policy.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read profiles of same-restaurant members" ON public.user_profiles;
CREATE POLICY "Members can read profiles of same-restaurant members"
ON public.user_profiles FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT rm.user_id
    FROM public.restaurant_members rm
    WHERE rm.restaurant_id IN (SELECT public.current_user_restaurant_ids())
  )
);
