-- Allow staff and admin to manage products (match orders pattern).
-- Public (anon) keeps: SELECT products WHERE available = true only.
-- Drop admin-only policies and create staff-or-admin policies.

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Staff and admins can manage products"
ON public.products FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);

DROP POLICY IF EXISTS "Admins can manage addons" ON public.product_addons;
CREATE POLICY "Staff and admins can manage addons"
ON public.product_addons FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff')
);
