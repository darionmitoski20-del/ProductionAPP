import { supabase } from '@/integrations/supabase/client';

export const PRODUCT_IMAGES_BUCKET = 'product-images';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateProductImageFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Only PNG, JPG, JPEG and WebP images are allowed.' };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: 'Image must be 5MB or smaller.' };
  }
  return { ok: true };
}

/**
 * Sanitize filename for storage path (keep extension, remove path separators and dangerous chars).
 */
function safeFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || 'image';
}

/**
 * Upload a product image to Supabase Storage.
 * Path: products/{productId}/{timestamp}-{safeFilename}
 * @returns Public URL of the uploaded file.
 */
export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const validation = validateProductImageFile(file);
  if (!validation.ok) throw new Error(validation.error);

  const timestamp = Date.now();
  const filename = safeFilename(file.name);
  const path = `products/${productId}/${timestamp}-${filename}`;

  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * If the given URL is from our product-images bucket, remove that object.
 * Safe no-op if URL is external or bucket/key cannot be determined.
 */
export async function deleteProductImageIfOurs(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl?.trim()) return;
  try {
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/product-images\/(.+)$/);
    if (!pathMatch) return;
    const objectPath = decodeURIComponent(pathMatch[1]);
    await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([objectPath]);
  } catch {
    // Ignore: URL parse or delete failure, don't break the flow
  }
}
