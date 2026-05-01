-- Populate name_en column with English translations for all products
-- Based on actual product names from database

-- =====================
-- BURGERS - Бургери
-- =====================
UPDATE products SET name_en = 'Chicken Burger' WHERE name = 'Пилешки бургер';
UPDATE products SET name_en = 'Walter Burger' WHERE name = 'Walter Burger';
UPDATE products SET name_en = 'Classic Burger' WHERE name = 'Класичен бургер';
UPDATE products SET name_en = 'Cheeseburger' WHERE name = 'Чизбургер';
UPDATE products SET name_en = 'Bacon Burger' WHERE name = 'Bacon burger';
UPDATE products SET name_en = 'Hamburger' WHERE name = 'Hamburgers';

-- =====================
-- PIZZAS - Пици
-- =====================
UPDATE products SET name_en = 'Pepperoni' WHERE name = 'Пеперони';
UPDATE products SET name_en = 'Margherita' WHERE name = 'Margarita';
UPDATE products SET name_en = 'BBQ Chicken' WHERE name = 'BBQ Пилешко';
UPDATE products SET name_en = 'Four Cheese' WHERE name = 'Четири сирења';
UPDATE products SET name_en = 'Gonde Pizza' WHERE name = 'Gonde Pizza';

-- =====================
-- WRAPS - Тортиљи/Врапови
-- =====================
UPDATE products SET name_en = 'Beef Wrap' WHERE name = 'Beef wrap';
UPDATE products SET name_en = 'Caesar Wrap' WHERE name = 'Caesar Wrap';

-- =====================
-- TOASTS - Тостови
-- =====================
UPDATE products SET name_en = 'Club Toast' WHERE name = 'Клуб тост';
UPDATE products SET name_en = 'Toast' WHERE name = 'Toast';

-- =====================
-- FRIES - Помфрит
-- =====================
UPDATE products SET name_en = 'Cheese Fries' WHERE name = 'Помфрит со сирење';
UPDATE products SET name_en = 'Classic Fries' WHERE name = 'Класичен помфрит';
UPDATE products SET name_en = 'Jalapeños Fries' WHERE name = 'JalapeñosFries';

-- =====================
-- SALADS - Салати
-- =====================
UPDATE products SET name_en = 'Caesar Salad' WHERE name = 'Цезар салата';
UPDATE products SET name_en = 'Greek Salad' WHERE name = 'Грчка салата';
UPDATE products SET name_en = 'Chicken Salad' WHERE name = 'Пилешка салата';

-- =====================
-- DRINKS - Пијалаци
-- =====================
UPDATE products SET name_en = 'Coca-Cola' WHERE name = 'Кока-Кола';
UPDATE products SET name_en = 'Orange Juice' WHERE name = 'Orange Juice';
UPDATE products SET name_en = 'Pepsi' WHERE name = 'Pepsi';
UPDATE products SET name_en = 'Fanta' WHERE name = 'Фанта';
UPDATE products SET name_en = 'Water' WHERE name = 'Вода';
