-- Ensure menu_categories allows authenticated users to manage categories (admin UI).
-- Idempotent: drop policies if they exist, then create.

ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_categories_select_authenticated" ON public.menu_categories;
DROP POLICY IF EXISTS "menu_categories_insert_authenticated" ON public.menu_categories;
DROP POLICY IF EXISTS "menu_categories_update_authenticated" ON public.menu_categories;
DROP POLICY IF EXISTS "menu_categories_delete_authenticated" ON public.menu_categories;

CREATE POLICY "menu_categories_select_authenticated"
ON public.menu_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "menu_categories_insert_authenticated"
ON public.menu_categories FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "menu_categories_update_authenticated"
ON public.menu_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "menu_categories_delete_authenticated"
ON public.menu_categories FOR DELETE TO authenticated USING (true);
