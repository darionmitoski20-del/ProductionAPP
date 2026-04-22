/** True when UI should use English strings (matches i18n `en`). */
export function isEnglishLocale(language: string | undefined): boolean {
  const base = (language ?? 'mk').split('-')[0]?.toLowerCase();
  return base === 'en';
}

export interface BilingualTextSource {
  mk?: string | null;
  en?: string | null;
  /** Legacy / canonical column (typically English). */
  base: string;
}

/**
 * Pick MK or EN text without hardcoding translations.
 * Missing locale-specific value falls back to `base` (usually DB `name` / `description`).
 */
export function resolveBilingualText(language: string | undefined, src: BilingualTextSource): string {
  const en = (src.en?.trim() || src.base).trim();
  const mk = (src.mk?.trim() || src.base).trim();
  return isEnglishLocale(language) ? en : mk;
}

export function resolveCategoryName(
  language: string | undefined,
  row: { name: string; name_mk?: string | null; name_en?: string | null }
): string {
  return resolveBilingualText(language, {
    mk: row.name_mk,
    en: row.name_en ?? row.name,
    base: row.name,
  });
}

export function resolveProductFields(
  language: string | undefined,
  row: {
    name: string;
    name_mk?: string | null;
    name_en?: string | null;
    description: string | null;
    description_mk?: string | null;
    description_en?: string | null;
  }
): { name: string; description: string | null } {
  const name = resolveBilingualText(language, {
    mk: row.name_mk,
    en: row.name_en ?? row.name,
    base: row.name,
  });
  const baseDesc = row.description ?? '';
  const description =
    baseDesc.trim() === ''
      ? null
      : resolveBilingualText(language, {
          mk: row.description_mk,
          en: row.description_en ?? row.description,
          base: baseDesc,
        });
  return { name, description };
}

export function resolveAddonOrSizeName(
  language: string | undefined,
  row: { name: string; name_mk?: string | null; name_en?: string | null }
): string {
  return resolveBilingualText(language, {
    mk: row.name_mk,
    en: row.name_en ?? row.name,
    base: row.name,
  });
}

/** Cart / persisted items: `name` may be a previously localized label; prefer `name_en` as English base. */
export function displayStoredProductName(
  language: string | undefined,
  product: {
    name: string;
    name_mk?: string | null;
    name_en?: string | null;
  }
): string {
  return resolveProductFields(language, {
    name: product.name_en ?? product.name,
    name_mk: product.name_mk,
    name_en: product.name_en,
    description: null,
    description_mk: null,
    description_en: null,
  }).name;
}

export function displayStoredAddonOrSizeName(
  language: string | undefined,
  row: { name: string; name_mk?: string | null; name_en?: string | null }
): string {
  return resolveAddonOrSizeName(language, {
    name: row.name_en ?? row.name,
    name_mk: row.name_mk,
    name_en: row.name_en,
  });
}
