/**
 * Convert hex color to HSL string in format "H S% L%" for CSS variables (e.g. Tailwind).
 */
export function hexToHsl(hex: string): string {
  const cleaned = hex.replace(/^#/, '');
  if (cleaned.length !== 3 && cleaned.length !== 6) return '0 0% 50%';
  const r = parseInt(cleaned.length === 3 ? cleaned[0] + cleaned[0] : cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.length === 3 ? cleaned[1] + cleaned[1] : cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.length === 3 ? cleaned[2] + cleaned[2] : cleaned.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lR = Math.round(l * 100);
  return `${h} ${s}% ${lR}%`;
}
