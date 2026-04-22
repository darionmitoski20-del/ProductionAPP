-- Bilingual menu: MK / EN fields (fallback to legacy `name` / `description` when null)

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name_mk text,
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS description_mk text,
  ADD COLUMN IF NOT EXISTS description_en text;

UPDATE public.products SET name_en = name WHERE name_en IS NULL;
UPDATE public.products SET description_en = description WHERE description_en IS NULL AND description IS NOT NULL;

ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS name_mk text,
  ADD COLUMN IF NOT EXISTS name_en text;

UPDATE public.menu_categories SET name_en = name WHERE name_en IS NULL;

ALTER TABLE public.product_addons
  ADD COLUMN IF NOT EXISTS name_mk text,
  ADD COLUMN IF NOT EXISTS name_en text;

UPDATE public.product_addons SET name_en = name WHERE name_en IS NULL;

ALTER TABLE public.product_sizes
  ADD COLUMN IF NOT EXISTS name_mk text,
  ADD COLUMN IF NOT EXISTS name_en text;

UPDATE public.product_sizes SET name_en = name WHERE name_en IS NULL;
