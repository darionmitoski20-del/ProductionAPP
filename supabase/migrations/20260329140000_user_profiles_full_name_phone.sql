-- Display name for staff admin UI (Staff Members cards)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT;
