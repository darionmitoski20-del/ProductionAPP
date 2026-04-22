/**
 * Business hours open/closed logic for a single storefront.
 * Timezone comes from app_design_settings.timezone (default Europe/Skopje).
 */

import { supabase } from '@/integrations/supabase/client';
import type { BusinessHoursDay, RestaurantOpenState, WeekdayTranslationKey } from '@/types';

const DEFAULT_TIMEZONE = 'Europe/Skopje';

const WEEKDAY_KEYS: WeekdayTranslationKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/**
 * Get current time components in the given timezone (hour, minute, day-of-week).
 * dayOfWeek: 0 = Sunday, 1 = Monday, ... 6 = Saturday (JS getDay()).
 */
function getLocalNow(tz: string): { hour: number; minute: number; dayOfWeek: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const date = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  const dayOfWeek = date.getDay();
  return { hour, minute, dayOfWeek };
}

/** Parse "HH:mm" or "HH:mm:ss" to minutes since midnight. */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

interface NextOpen {
  openTime: string;
  dayKey: WeekdayTranslationKey;
  sameDay: boolean;
  nextOpenAt: string | null;
}

function getNextOpening(
  byDay: Map<number, BusinessHoursDay>,
  fromDayOfWeek: number,
  _afterTimeMinutes: number | null,
  _tz: string
): NextOpen | null {
  for (let d = 1; d <= 7; d++) {
    const dayOfWeek = (fromDayOfWeek + d) % 7;
    const row = byDay.get(dayOfWeek);
    if (row?.is_open && row.open_time != null) {
      const dayKey: WeekdayTranslationKey = d === 1 ? 'tomorrow' : WEEKDAY_KEYS[dayOfWeek];
      const openTime = row.open_time.slice(0, 5);
      return {
        openTime,
        dayKey,
        sameDay: false,
        nextOpenAt: null,
      };
    }
  }
  return null;
}

/** Compute whether the shop is open right now and status message. */
export function computeOpenState(
  hours: BusinessHoursDay[],
  timezone: string = DEFAULT_TIMEZONE
): RestaurantOpenState {
  const tz = timezone && timezone.trim() ? timezone : DEFAULT_TIMEZONE;
  const openNow = (): RestaurantOpenState => ({
    isOpen: true,
    isOnBreak: false,
    statusMessage: 'Open now',
    statusI18n: { key: 'hours.openNow' },
    nextOpenAt: null,
  });

  if (hours.length === 0) {
    return openNow();
  }
  const now = getLocalNow(tz);
  const currentMinutes = now.hour * 60 + now.minute;

  const byDay = new Map<number, BusinessHoursDay>();
  for (const row of hours) {
    byDay.set(row.day_of_week, row);
  }

  const today = byDay.get(now.dayOfWeek);

  // Closed all day today
  if (!today || !today.is_open || today.open_time == null || today.close_time == null) {
    const next = getNextOpening(byDay, now.dayOfWeek, null, tz);
    if (!next) {
      return {
        isOpen: false,
        isOnBreak: false,
        statusMessage: 'Closed today',
        statusI18n: { key: 'hours.closedToday' },
        nextOpenAt: null,
      };
    }
    const msg = next.sameDay
      ? `Closed – opens at ${next.openTime}`
      : `Closed now – opens ${next.dayKey} at ${next.openTime}`;
    return {
      isOpen: false,
      isOnBreak: false,
      statusMessage: msg,
      statusI18n: next.sameDay
        ? { key: 'hours.closedOpensAt', time: next.openTime }
        : { key: 'hours.closedOpensLaterAt', dayKey: next.dayKey, time: next.openTime },
      nextOpenAt: next.nextOpenAt,
    };
  }

  const openM = timeToMinutes(today.open_time);
  const closeM = timeToMinutes(today.close_time);

  // Before opening
  if (currentMinutes < openM) {
    const time = today.open_time.slice(0, 5);
    return {
      isOpen: false,
      isOnBreak: false,
      statusMessage: `Closed – opens at ${time}`,
      statusI18n: { key: 'hours.closedOpensAt', time },
      nextOpenAt: null,
    };
  }

  // After closing
  if (currentMinutes >= closeM) {
    const next = getNextOpening(byDay, now.dayOfWeek, null, tz);
    if (!next) {
      return {
        isOpen: false,
        isOnBreak: false,
        statusMessage: 'Closed for today',
        statusI18n: { key: 'hours.closedForToday' },
        nextOpenAt: null,
      };
    }
    const msg = next.sameDay
      ? `Closed – opens at ${next.openTime}`
      : `Closed now – opens ${next.dayKey} at ${next.openTime}`;
    return {
      isOpen: false,
      isOnBreak: false,
      statusMessage: msg,
      statusI18n: next.sameDay
        ? { key: 'hours.closedOpensAt', time: next.openTime }
        : { key: 'hours.closedOpensLaterAt', dayKey: next.dayKey, time: next.openTime },
      nextOpenAt: next?.nextOpenAt ?? null,
    };
  }

  // Break
  if (today.break_start != null && today.break_end != null) {
    const breakStartM = timeToMinutes(today.break_start);
    const breakEndM = timeToMinutes(today.break_end);
    if (currentMinutes >= breakStartM && currentMinutes < breakEndM) {
      const resume = today.break_end.slice(0, 5);
      return {
        isOpen: false,
        isOnBreak: true,
        statusMessage: `On break – ordering resumes at ${resume}`,
        statusI18n: { key: 'hours.onBreakResumes', time: resume },
        nextOpenAt: null,
      };
    }
  }

  return openNow();
}

export { DEFAULT_TIMEZONE };

/**
 * Fetch global business hours and app timezone; used before order insert.
 */
export async function fetchShopOpenState(): Promise<RestaurantOpenState> {
  const [hoursRes, tzRes] = await Promise.all([
    supabase.from('restaurant_business_hours').select('*').order('day_of_week'),
    supabase
      .from('app_design_settings')
      .select('timezone')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (hoursRes.error) throw hoursRes.error;

  const hours: BusinessHoursDay[] = (hoursRes.data ?? []).map((r: Record<string, unknown>) => ({
    day_of_week: Number(r.day_of_week),
    is_open: Boolean(r.is_open),
    open_time: r.open_time != null ? String(r.open_time).slice(0, 8) : null,
    close_time: r.close_time != null ? String(r.close_time).slice(0, 8) : null,
    break_start: r.break_start != null ? String(r.break_start).slice(0, 8) : null,
    break_end: r.break_end != null ? String(r.break_end).slice(0, 8) : null,
  }));

  const tz =
    (tzRes.data as { timezone?: string } | null)?.timezone?.trim() || DEFAULT_TIMEZONE;
  return computeOpenState(hours, tz);
}
