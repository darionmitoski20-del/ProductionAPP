/**
 * North Macedonia mobile: national form 07X + 6 digits (9 digits total after leading 0).
 * Accepts pasted +389… or 8-digit 7XXXXXXXX by normalizing to 07XXXXXXXX.
 */

export function normalizeMacedonianMobile(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('389')) {
    d = d.slice(3);
  }
  if (d.length === 8 && d.startsWith('7')) {
    d = `0${d}`;
  }
  return d;
}

export function isValidMacedonianMobile(input: string): boolean {
  const d = normalizeMacedonianMobile(input);
  return /^07[0-9]{7}$/.test(d);
}
