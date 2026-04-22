-- Lock menu and products: only admin can INSERT/UPDATE/DELETE. Staff can SELECT only.

-- menu_categories: drop staff from insert/update/delete
DROP POLICY IF EXISTS "Staff and admins can insert categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Staff and admins can update categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Staff and admins can delete categories" ON public.menu_categories;

CREATE POLICY "Admins can insert categories"
ON public.menu_categories FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update categories"
ON public.menu_categories FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete categories"
ON public.menu_categories FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- products: admin-only write; staff+admin can read
DROP POLICY IF EXISTS "Staff and admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Staff and admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Staff and admins can update products" ON public.products;
DROP POLICY IF EXISTS "Staff and admins can delete products" ON public.products;

CREATE POLICY "Admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff and admins can read products"
ON public.products FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- product_addons: admin-only write; staff+admin can read
DROP POLICY IF EXISTS "Staff and admins can manage addons" ON public.product_addons;
DROP POLICY IF EXISTS "Staff and admins can manage product addons" ON public.product_addons;

CREATE POLICY "Admins can insert product addons"
ON public.product_addons FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product addons"
ON public.product_addons FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product addons"
ON public.product_addons FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff and admins can read product addons"
ON public.product_addons FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
