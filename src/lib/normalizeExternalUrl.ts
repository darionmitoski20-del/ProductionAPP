/** Turn admin-entered social (or other) links into safe hrefs. */
export function normalizeExternalUrl(url: string | null | undefined): string | null {
  const u = url?.trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `https://${u}`;
}
