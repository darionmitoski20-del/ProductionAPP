-- Menu categories table (extensible; seeded with existing enum values, new ones added via UI)
CREATE TABLE public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (slug)
);

-- Unique on lower(name) for case-insensitive duplicate check
CREATE UNIQUE INDEX menu_categories_name_lower_key ON public.menu_categories (lower(name));

-- Update updated_at
CREATE TRIGGER update_menu_categories_updated_at
  BEFORE UPDATE ON public.menu_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed existing categories (do not modify; same as product_category enum)
INSERT INTO public.menu_categories (name, slug, icon, sort_order) VALUES
  ('Pizzas', 'pizzas', '🍕', 1),
  ('Burgers', 'burgers', '🍔', 2),
  ('Wraps', 'wraps', '🌯', 3),
  ('Toasts', 'toasts', '🥪', 4),
  ('Fries', 'fries', '🍟', 5),
  ('Salads', 'salads', '🥗', 6),
  ('Drinks', 'drinks', '🥤', 7)
ON CONFLICT (slug) DO NOTHING;

-- Link products to categories (optional FK; existing behavior unchanged)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL;

-- Backfill: set category_id from current enum so existing products point to seeded rows
UPDATE public.products p
SET category_id = (SELECT id FROM public.menu_categories c WHERE c.slug = p.category::text)
WHERE p.category_id IS NULL AND p.category IS NOT NULL;

-- Allow category to be null for products that only use category_id (new categories)
ALTER TABLE public.products
  ALTER COLUMN category DROP NOT NULL;

-- RLS
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- Public: read active categories only
CREATE POLICY "Public can view active categories"
ON public.menu_categories FOR SELECT
USING (is_active = true);

-- Staff/admin: read all, insert (for New Category)
CREATE POLICY "Staff and admins can view all categories"
ON public.menu_categories FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and admins can insert categories"
ON public.menu_categories FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
