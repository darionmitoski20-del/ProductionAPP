-- Category icons are no longer used by the app; clear values (column kept for backwards compatibility).
UPDATE public.menu_categories SET icon = NULL WHERE icon IS NOT NULL;
