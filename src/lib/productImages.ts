import type { Product, ProductCategory } from '@/types';

/**
 * High-quality food image URLs (Unsplash). Key: product name normalized to lowercase.
 * Fallback by category used when product name is not in map.
 */
const PRODUCT_IMAGE_URLS: Record<string, string> = {
  // Pizzas
  margherita: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&q=80',
  pepperoni: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80',
  'bbq chicken': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
  'quattro formaggi': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
  // Burgers
  'classic burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  'cheese burger': 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&q=80',
  'bacon deluxe': 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&q=80',
  'chicken burger': 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80',
  // Wraps
  'chicken caesar wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80',
  'falafel wrap': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80',
  'beef shawarma': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80',
  // Toasts
  'club toast': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT54ZWbnpXUO_25GCNPotT3MDiOMuAZEcKSFA&s',
  'tuna melt': 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80',
  'avocado toast': 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=600&q=80',
  // Fries
  'classic fries': 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80',
  'cheese fries': 'https://t3.ftcdn.net/jpg/16/64/63/36/360_F_1664633676_BLKCQV90SMGwEfuqg10f5pfsbfFjvaea.jpg',
  'loaded fries': 'https://t3.ftcdn.net/jpg/09/65/86/40/360_F_965864072_pn1DCg9xJ3EgdxnlxpFcLTKc8XU2uyiR.jpg',// Salads
 // Salads
  'caesar salad': 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&q=80',
  'greek salad': 'https://www.killingthyme.net/wp-content/uploads/2024/06/greek-salad-with-feta-1-500x375.jpg',
  'chicken salad': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
  // Drinks
  'coca-cola': 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80',
  fanta: 'https://cdn3.evostore.io/productimages/fusion/l/fus_224170.jpg',
  sprite: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=600&q=80',
  water: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&q=80',
  'fresh juice': 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&q=80',
};

const CATEGORY_FALLBACK_IMAGES: Record<ProductCategory, string> = {
  pizzas: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
  burgers: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  wraps: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600&q=80',
  toasts: 'https://images.unsplash.com/photo-1528735602780-3272a2843ede?w=600&q=80',
  fries: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80',
  salads: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
  drinks: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&q=80',
};

export function getProductImageUrl(product: Product): string {
  if (product.image_url) return product.image_url;
  const key = product.name.toLowerCase().trim();
  return PRODUCT_IMAGE_URLS[key] ?? CATEGORY_FALLBACK_IMAGES[product.category];
}
