-- Add unique images for each product from Unsplash

-- =====================
-- PIZZAS - Пици
-- =====================
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80' 
WHERE name = 'Пеперони';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80' 
WHERE name = 'Margarita';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80' 
WHERE name = 'BBQ Пилешко';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528137871618-79d2761e3fd5?w=800&q=80' 
WHERE name = 'Четири сирења';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&q=80' 
WHERE name = 'Gonde Pizza';

-- =====================
-- BURGERS - Бургери
-- =====================
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80' 
WHERE name = 'Класичен бургер';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80' 
WHERE name = 'Чизбургер';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&q=80' 
WHERE name = 'Пилешки бургер';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80' 
WHERE name = 'Bacon burger';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80' 
WHERE name = 'Walter Burger';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&q=80' 
WHERE name = 'Hamburgers';

-- =====================
-- WRAPS - Врапови
-- =====================
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80' 
WHERE name = 'Beef wrap';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=800&q=80' 
WHERE name = 'Caesar Wrap';

-- =====================
-- TOASTS - Тостови
-- =====================
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&q=80' 
WHERE name = 'Клуб тост';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&q=80' 
WHERE name = 'Toast';

-- =====================
-- FRIES - Помфрит
-- =====================
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80' 
WHERE name = 'Класичен помфрит';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=800&q=80' 
WHERE name = 'Помфрит со сирење';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1629385701021-04e10a4e2d67?w=800&q=80' 
WHERE name = 'JalapeñosFries';

-- =====================
-- SALADS - Салати
-- =====================
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800&q=80' 
WHERE name = 'Цезар салата';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80' 
WHERE name = 'Грчка салата';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1604497181015-76590d828b75?w=800&q=80' 
WHERE name = 'Пилешка салата';

-- =====================
-- DRINKS - Пијалаци (official product images)
-- =====================
UPDATE products SET image_url = 'https://www.coca-cola.com/content/dam/onexp/global/central/offerings/coca-cola-original-702702-wm-en.png' 
WHERE name = 'Кока-Кола';

UPDATE products SET image_url = 'https://www.coca-cola.com/content/dam/onexp/global/central/offerings/fanta-orange-702762-wm-en.png' 
WHERE name = 'Фанта';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&q=80' 
WHERE name = 'Orange Juice';

UPDATE products SET image_url = 'https://www.pepsico.com/images/default-source/products-brands/pepsi_productimage.png' 
WHERE name = 'Pepsi';

UPDATE products SET image_url = 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=400&q=80' 
WHERE name = 'Вода';
