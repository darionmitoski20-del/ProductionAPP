-- Staff UI no longer uses phone; remove column from user_profiles
ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS phone;
