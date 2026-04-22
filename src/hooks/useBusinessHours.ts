import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BusinessHoursDay } from '@/types';

const BUSINESS_HOURS_QUERY_KEY = ['business-hours'] as const;
const LOG_PREFIX = '[useBusinessHours]';

/** Normalize to HH:mm for DB time column. Returns null for empty/invalid. */
function normalizeTime(t: string | null | undefined): string | null {
  if (t == null || typeof t !== 'string') return null;
  const s = t.trim();
  if (s === '') return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
}

/** Parse HH:mm or HH:mm:ss to minutes since midnight. */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

function buildDayPayload(d: BusinessHoursDay): Record<string, unknown> {
  if (!d.is_open) {
    return {
      restaurant_id: null,
      day_of_week: d.day_of_week,
      is_open: false,
      open_time: null,
      close_time: null,
      break_start: null,
      break_end: null,
      updated_at: new Date().toISOString(),
    };
  }

  const openTime = normalizeTime(d.open_time);
  const closeTime = normalizeTime(d.close_time);
  if (!openTime || !closeTime) {
    throw new Error(
      `Day ${d.day_of_week}: when open, open_time and close_time must be set (HH:mm).`
    );
  }
  const openM = timeToMinutes(openTime);
  const closeM = timeToMinutes(closeTime);
  if (closeM <= openM) {
    throw new Error(`Day ${d.day_of_week}: close_time must be after open_time.`);
  }

  let breakStart: string | null = null;
  let breakEnd: string | null = null;
  if (d.break_start != null && d.break_start.trim() !== '' && d.break_end != null && d.break_end.trim() !== '') {
    breakStart = normalizeTime(d.break_start);
    breakEnd = normalizeTime(d.break_end);
    if (!breakStart || !breakEnd) {
      throw new Error(`Day ${d.day_of_week}: break times must be valid HH:mm.`);
    }
    const bStartM = timeToMinutes(breakStart);
    const bEndM = timeToMinutes(breakEnd);
    if (bEndM <= bStartM) {
      throw new Error(`Day ${d.day_of_week}: break end must be after break start.`);
    }
    if (bStartM < openM || bEndM > closeM) {
      throw new Error(`Day ${d.day_of_week}: break must be within open/close hours.`);
    }
  }

  return {
    restaurant_id: null,
    day_of_week: d.day_of_week,
    is_open: true,
    open_time: openTime,
    close_time: closeTime,
    break_start: breakStart,
    break_end: breakEnd,
    updated_at: new Date().toISOString(),
  };
}

function rowToDay(row: Record<string, unknown>): BusinessHoursDay {
  return {
    id: row.id as string,
    day_of_week: Number(row.day_of_week),
    is_open: Boolean(row.is_open),
    open_time: row.open_time != null ? String(row.open_time).slice(0, 8) : null,
    close_time: row.close_time != null ? String(row.close_time).slice(0, 8) : null,
    break_start: row.break_start != null ? String(row.break_start).slice(0, 8) : null,
    break_end: row.break_end != null ? String(row.break_end).slice(0, 8) : null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/** Single-store business hours (one global schedule). */
export function useBusinessHours() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: BUSINESS_HOURS_QUERY_KEY,
    queryFn: async (): Promise<BusinessHoursDay[]> => {
      const { data, error } = await supabase
        .from('restaurant_business_hours')
        .select('*')
        .order('day_of_week');

      if (error) throw error;
      return (data ?? []).map((r) => rowToDay(r));
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (days: BusinessHoursDay[]) => {
      for (const d of days) {
        const payload = buildDayPayload(d);
        const { error } = await supabase.from('restaurant_business_hours').upsert(payload, {
          onConflict: 'day_of_week',
        });
        if (error) {
          console.error(LOG_PREFIX, 'Supabase error', {
            day_of_week: d.day_of_week,
            is_open: d.is_open,
            payload: { ...payload },
            error: error.message,
            code: error.code,
            details: error.details,
          });
          throw error;
        }
      }
      return days;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_HOURS_QUERY_KEY });
    },
  });

  return {
    ...query,
    upsert: upsertMutation.mutateAsync,
    upserting: upsertMutation.isPending,
  };
}
