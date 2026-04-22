-- ============================================================
-- Migration: Create user_profiles table + is_admin() + RLS
-- ============================================================

-- 1) Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email      TEXT UNIQUE NOT NULL,
    role       TEXT NOT NULL CHECK (role IN ('ADMIN', 'STAFF')) DEFAULT 'STAFF',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 3) Helper function: is_admin(uid)
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = uid AND role = 'ADMIN'
  )
$$;

-- 4) RLS Policies on user_profiles

-- Any logged-in user can SELECT their own row
CREATE POLICY "Users can view own profile"
ON public.user_profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- ADMIN can SELECT all rows
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- ADMIN can UPDATE role
CREATE POLICY "Admins can update profiles"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ADMIN can DELETE
CREATE POLICY "Admins can delete profiles"
ON public.user_profiles FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ADMIN can INSERT (service role bypasses RLS, but needed if calling via authenticated)
CREATE POLICY "Admins can insert profiles"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 5) Migrate existing user_roles data into user_profiles
INSERT INTO public.user_profiles (id, email, role, created_at)
SELECT
  ur.user_id,
  au.email,
  CASE WHEN ur.role::text = 'admin' THEN 'ADMIN' ELSE 'STAFF' END,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users au ON au.id = ur.user_id
ON CONFLICT (id) DO NOTHING;

-- 6) Update has_role() to also check user_profiles for backward compatibility
--    This ensures existing RLS policies on orders/products keep working
--    for users that only exist in user_profiles (new users).
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE id = _user_id
      AND (
        (_role::text = 'admin' AND role = 'ADMIN')
        OR (_role::text = 'staff' AND role = 'STAFF')
      )
  )
$$;
