-- Product size variants (e.g. Small/Medium/Large) with per-size full prices.

CREATE TABLE IF NOT EXISTS public.product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  sort_order smallint NOT NULL DEFAULT 0,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_sizes_product_name_uq
  ON public.product_sizes (product_id, lower(name));

CREATE INDEX IF NOT EXISTS product_sizes_product_id_sort_idx
  ON public.product_sizes (product_id, sort_order, name);

ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

-- Public can read only available sizes (customer menu), staff/admin can read all.
CREATE POLICY "Public can read available product sizes"
ON public.product_sizes FOR SELECT
USING (
  available = true
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'staff')
);

CREATE POLICY "Admins can insert product sizes"
ON public.product_sizes FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product sizes"
ON public.product_sizes FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product sizes"
ON public.product_sizes FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
