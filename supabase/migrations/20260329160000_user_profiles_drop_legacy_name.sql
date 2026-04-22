-- Legacy column `name` on user_profiles → `full_name` (app uses full_name only).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'full_name'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN full_name TEXT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'name'
  ) THEN
    UPDATE public.user_profiles
    SET full_name = CASE
      WHEN full_name IS NOT NULL AND btrim(COALESCE(full_name, '')) <> '' THEN btrim(full_name)
      WHEN name IS NOT NULL AND btrim(COALESCE(name::text, '')) <> '' THEN btrim(name::text)
      ELSE NULL
    END;
    ALTER TABLE public.user_profiles DROP COLUMN name;
  END IF;
END $$;
