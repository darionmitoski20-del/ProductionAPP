-- Fix drink images with real Unsplash photos

-- Coca-Cola (red soda can)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&q=80' 
WHERE name = 'Кока-Кола';

-- Fanta (orange soda)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1624552184280-9e9631bbeee9?w=400&q=80' 
WHERE name = 'Фанта';

-- Orange Juice
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80' 
WHERE name = 'Orange Juice';

-- Pepsi (blue soda can)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1553456558-aff63285bdd1?w=400&q=80' 
WHERE name = 'Pepsi';

-- Water bottle
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1560023907-5f339617ea30?w=400&q=80' 
WHERE name = 'Вода';
