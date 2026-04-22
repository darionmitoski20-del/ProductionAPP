import type { TFunction } from 'i18next';
import type { BusinessHoursDay } from '@/types';

/** Monday → Sunday (ISO-style week for the footer list). */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const DOW_TO_KEY = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/** One line per weekday for the public menu footer (uses `hours.weekdays.*` and `footer.*`). */
export function formatFooterBusinessHoursLines(
  rows: BusinessHoursDay[] | undefined,
  t: TFunction
): string[] {
  if (!rows?.length) return [];
  const byDay = new Map(rows.map((r) => [r.day_of_week, r]));
  const lines: string[] = [];
  for (const dow of DAY_ORDER) {
    const d = byDay.get(dow);
    if (!d) continue;
    const dayKey = DOW_TO_KEY[dow];
    const dayLabel = t(`hours.weekdays.${dayKey}`);
    if (!d.is_open || !d.open_time || !d.close_time) {
      lines.push(`${dayLabel}: ${t('footer.closed')}`);
      continue;
    }
    const open = d.open_time.slice(0, 5);
    const close = d.close_time.slice(0, 5);
    let line = `${dayLabel}: ${open}–${close}`;
    if (d.break_start && d.break_end) {
      line += ` (${t('footer.breakShort', {
        start: d.break_start.slice(0, 5),
        end: d.break_end.slice(0, 5),
      })})`;
    }
    lines.push(line);
  }
  return lines;
}
