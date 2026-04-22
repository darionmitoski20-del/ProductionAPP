import { supabase } from '@/integrations/supabase/client';

export const APP_ASSETS_BUCKET = 'app-assets';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function validateImage(file: File): { ok: true } | { ok: false; error: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Only PNG, JPG, JPEG and WebP images are allowed.' };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: 'Image must be 5MB or smaller.' };
  }
  return { ok: true };
}

function safeFilename(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || 'image';
}

/**
 * Upload an asset to app-assets bucket.
 * Path: design/{folder}/{timestamp}-{safeFilename}
 * @returns Public URL of the uploaded file.
 */
export async function uploadAppAsset(file: File, folder: string): Promise<string> {
  const validation = validateImage(file);
  if (!validation.ok) throw new Error(validation.error);

  const timestamp = Date.now();
  const filename = safeFilename(file.name);
  const path = `design/${folder}/${timestamp}-${filename}`;

  const { error } = await supabase.storage.from(APP_ASSETS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(APP_ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
