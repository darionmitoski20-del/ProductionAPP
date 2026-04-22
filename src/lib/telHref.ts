/** Build a `tel:` href from a human-entered phone string. */
export function buildTelHref(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return '#';
  const normalized = trimmed.replace(/[^\d+]/g, '');
  if (!normalized.replace(/\+/g, '')) return '#';
  return `tel:${normalized}`;
}
