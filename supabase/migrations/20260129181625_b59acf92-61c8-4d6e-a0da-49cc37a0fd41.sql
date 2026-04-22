-- Create order status enum
CREATE TYPE public.order_status AS ENUM ('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELED');

-- Create product categories enum
CREATE TYPE public.product_category AS ENUM ('pizzas', 'burgers', 'wraps', 'toasts', 'fries', 'salads', 'drinks');

-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- Create products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category product_category NOT NULL,
    image_url TEXT,
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create product_addons table
CREATE TABLE public.product_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    available BOOLEAN DEFAULT true
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number SERIAL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    pickup_time_option TEXT NOT NULL DEFAULT 'asap',
    pickup_time TIMESTAMP WITH TIME ZONE,
    order_note TEXT,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status order_status NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create order_items table
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    addons JSONB DEFAULT '[]',
    comment TEXT,
    subtotal DECIMAL(10,2) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for products (public read, admin write)
CREATE POLICY "Anyone can view available products"
ON public.products FOR SELECT
USING (available = true);

CREATE POLICY "Admins can manage products"
ON public.products FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for product_addons (public read, admin write)
CREATE POLICY "Anyone can view available addons"
ON public.product_addons FOR SELECT
USING (available = true);

CREATE POLICY "Admins can manage addons"
ON public.product_addons FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders (anyone can create, staff/admin can view all)
CREATE POLICY "Anyone can create orders"
ON public.orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff and admins can view all orders"
ON public.orders FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Anyone can view their order by id"
ON public.orders FOR SELECT
USING (true);

CREATE POLICY "Staff and admins can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- RLS Policies for order_items
CREATE POLICY "Anyone can insert order items"
ON public.order_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view order items"
ON public.order_items FOR SELECT
USING (true);

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample products
INSERT INTO public.products (name, description, price, category, image_url) VALUES
-- Pizzas
('Margherita', 'Classic tomato sauce, mozzarella, fresh basil', 350, 'pizzas', null),
('Pepperoni', 'Tomato sauce, mozzarella, spicy pepperoni', 420, 'pizzas', null),
('BBQ Chicken', 'BBQ sauce, grilled chicken, red onion, mozzarella', 480, 'pizzas', null),
('Quattro Formaggi', 'Four cheese blend: mozzarella, gorgonzola, parmesan, ricotta', 450, 'pizzas', null),
-- Burgers
('Classic Burger', 'Beef patty, lettuce, tomato, onion, pickles, special sauce', 280, 'burgers', null),
('Cheese Burger', 'Beef patty, double cheddar, lettuce, tomato, pickles', 320, 'burgers', null),
('Bacon Deluxe', 'Beef patty, crispy bacon, cheddar, caramelized onions', 380, 'burgers', null),
('Chicken Burger', 'Crispy chicken breast, lettuce, mayo, pickles', 290, 'burgers', null),
-- Wraps
('Chicken Caesar Wrap', 'Grilled chicken, romaine, parmesan, caesar dressing', 260, 'wraps', null),
('Falafel Wrap', 'Crispy falafel, hummus, fresh veggies, tahini sauce', 240, 'wraps', null),
('Beef Shawarma', 'Seasoned beef, pickles, garlic sauce, fresh veggies', 280, 'wraps', null),
-- Toasts
('Club Toast', 'Turkey, bacon, lettuce, tomato, mayo on toasted bread', 220, 'toasts', null),
('Tuna Melt', 'Tuna salad, melted cheese on crispy toast', 200, 'toasts', null),
('Avocado Toast', 'Fresh avocado, cherry tomatoes, feta, olive oil', 190, 'toasts', null),
-- Fries
('Classic Fries', 'Crispy golden french fries', 90, 'fries', null),
('Cheese Fries', 'Fries loaded with melted cheddar', 130, 'fries', null),
('Loaded Fries', 'Fries with bacon, cheese, jalapeños, sour cream', 180, 'fries', null),
-- Salads
('Caesar Salad', 'Romaine, croutons, parmesan, caesar dressing', 180, 'salads', null),
('Greek Salad', 'Cucumber, tomato, olives, feta, olive oil', 170, 'salads', null),
('Chicken Salad', 'Mixed greens, grilled chicken, cherry tomatoes, balsamic', 220, 'salads', null),
-- Drinks
('Coca-Cola', 'Classic Coca-Cola 330ml', 60, 'drinks', null),
('Fanta', 'Orange Fanta 330ml', 60, 'drinks', null),
('Sprite', 'Sprite 330ml', 60, 'drinks', null),
('Water', 'Natural mineral water 500ml', 40, 'drinks', null),
('Fresh Juice', 'Orange or Apple juice 300ml', 80, 'drinks', null);

-- Insert addons for products
INSERT INTO public.product_addons (product_id, name, price)
SELECT id, 'Extra Cheese', 40 FROM public.products WHERE category IN ('pizzas', 'burgers', 'toasts');

INSERT INTO public.product_addons (product_id, name, price)
SELECT id, 'Bacon', 50 FROM public.products WHERE category IN ('burgers', 'wraps', 'toasts');

INSERT INTO public.product_addons (product_id, name, price)
SELECT id, 'Jalapeños', 20 FROM public.products WHERE category IN ('pizzas', 'burgers', 'wraps');

INSERT INTO public.product_addons (product_id, name, price)
SELECT id, 'Extra Sauce', 15 FROM public.products WHERE category IN ('burgers', 'wraps', 'fries');

INSERT INTO public.product_addons (product_id, name, price)
SELECT id, 'Grilled Chicken', 60 FROM public.products WHERE category = 'salads';