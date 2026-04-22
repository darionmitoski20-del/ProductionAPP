import { supabase } from '@/integrations/supabase/client';

const APP_ASSETS_BUCKET = 'app-assets';
const DESIGN_PREFIX = 'design/';

/**
 * If url is a Supabase Storage public URL for bucket 'app-assets', return the object path.
 * Otherwise return null (external URL or unknown).
 * Path must start with "design/" for extra safety.
 */
export function parseAppAssetsPathFromPublicUrl(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url);
    // Supabase public URL pathname: /storage/v1/object/public/app-assets/design/...
    const match = parsed.pathname.match(/\/app-assets\/(.+)$/);
    if (!match) return null;
    const path = decodeURIComponent(match[1]);
    if (!path.startsWith(DESIGN_PREFIX)) return null;
    return path;
  } catch {
    return null;
  }
}

/**
 * If url points to our app-assets bucket and path starts with "design/", remove the object.
 * Otherwise do nothing (external URL – do not call storage.remove).
 * Returns true if we attempted and succeeded at deletion; false if url was not ours.
 * Throws on storage error when we did attempt delete.
 */
export async function deleteAppAssetIfOurs(
  url: string | null | undefined
): Promise<boolean> {
  if (!url?.trim()) return false;
  const path = parseAppAssetsPathFromPublicUrl(url);
  if (path === null) return false;
  const { error } = await supabase.storage.from(APP_ASSETS_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
  return true;
}
