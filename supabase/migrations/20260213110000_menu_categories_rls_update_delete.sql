-- Allow staff/admin to UPDATE and DELETE menu_categories (existing SELECT/INSERT already in place)
CREATE POLICY "Staff and admins can update categories"
ON public.menu_categories FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and admins can delete categories"
ON public.menu_categories FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
