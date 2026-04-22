-- Normalize category icons from legacy emoji to Lucide icon names (UTF-8 literals; matches app resolver).

UPDATE public.menu_categories SET icon = 'UtensilsCrossed' WHERE icon = '🍽️';
UPDATE public.menu_categories SET icon = 'Pizza' WHERE icon = '🍕';
UPDATE public.menu_categories SET icon = 'Beef' WHERE icon = '🍔';
UPDATE public.menu_categories SET icon = 'ScrollText' WHERE icon = '🌯';
UPDATE public.menu_categories SET icon = 'Salad' WHERE icon = '🥗';
UPDATE public.menu_categories SET icon = 'Flame' WHERE icon IN ('🍟', '🌶️', '🌶');
UPDATE public.menu_categories SET icon = 'Sandwich' WHERE icon IN ('🥪', '🍞');
UPDATE public.menu_categories SET icon = 'CookingPot' WHERE icon = '🧆';
UPDATE public.menu_categories SET icon = 'Drumstick' WHERE icon = '🍗';
UPDATE public.menu_categories SET icon = 'Fish' WHERE icon IN ('🍣', '🍤');
UPDATE public.menu_categories SET icon = 'Donut' WHERE icon = '🍩';
UPDATE public.menu_categories SET icon = 'Croissant' WHERE icon = '🥐';
UPDATE public.menu_categories SET icon = 'Cookie' WHERE icon IN ('🥨', '🧀');
UPDATE public.menu_categories SET icon = 'Cake' WHERE icon = '🍰';
UPDATE public.menu_categories SET icon = 'IceCreamCone' WHERE icon = '🧁';
UPDATE public.menu_categories SET icon = 'Coffee' WHERE icon = '☕';
UPDATE public.menu_categories SET icon = 'CupSoda' WHERE icon = '🥤';
UPDATE public.menu_categories SET icon = 'Beer' WHERE icon = '🍺';
UPDATE public.menu_categories SET icon = 'GlassWater' WHERE icon = '🧃';
UPDATE public.menu_categories SET icon = 'Apple' WHERE icon = '🍎';
UPDATE public.menu_categories SET icon = 'Cherry' WHERE icon = '🍓';

UPDATE public.menu_categories SET icon = 'UtensilsCrossed' WHERE icon IS NULL OR trim(icon) = '';
