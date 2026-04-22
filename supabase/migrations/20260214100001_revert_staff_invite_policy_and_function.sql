-- Revert: remove policy and function added by 20260214100000_staff_invite_without_service_role.sql
-- Run this if you had already applied that migration and want to undo it.

DROP POLICY IF EXISTS "Admins can insert user_roles" ON public.user_roles;
DROP FUNCTION IF EXISTS public.get_user_id_by_email(text);
