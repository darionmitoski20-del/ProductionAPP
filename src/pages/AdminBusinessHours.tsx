import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { useRestaurantOpenState } from '@/hooks/useRestaurantOpenState';
import type { BusinessHoursDay } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';

const DAY_ORDER: number[] = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

function timeToInput(t: string | null | undefined): string {
  if (t == null || t === '') return '';
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function defaultDay(dayOfWeek: number): BusinessHoursDay {
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  return {
    day_of_week: dayOfWeek,
    is_open: isWeekday,
    open_time: isWeekday ? '08:00' : null,
    close_time: isWeekday ? '23:00' : null,
    break_start: null,
    break_end: null,
  };
}

function validateDays(days: BusinessHoursDay[]): string | null {
  for (const d of days) {
    if (!d.is_open) continue;
    const open = d.open_time != null ? String(d.open_time).trim() : '';
    const close = d.close_time != null ? String(d.close_time).trim() : '';
    if (!open || !close) return `${DAY_LABELS[d.day_of_week]}: set open and close time when open.`;
    const openM = parseTime(open);
    const closeM = parseTime(close);
    if (openM == null || closeM == null) return `${DAY_LABELS[d.day_of_week]}: use HH:mm format.`;
    if (closeM <= openM) return `${DAY_LABELS[d.day_of_week]}: close time must be after open time.`;
    if (d.break_start || d.break_end) {
      const bs = d.break_start != null ? String(d.break_start).trim() : '';
      const be = d.break_end != null ? String(d.break_end).trim() : '';
      if (!bs || !be) return `${DAY_LABELS[d.day_of_week]}: set both break start and end or leave both empty.`;
      const bStart = parseTime(bs);
      const bEnd = parseTime(be);
      if (bStart == null || bEnd == null) return `${DAY_LABELS[d.day_of_week]}: break times must be HH:mm.`;
      if (bEnd <= bStart) return `${DAY_LABELS[d.day_of_week]}: break end must be after break start.`;
      if (bStart < openM || bEnd > closeM) return `${DAY_LABELS[d.day_of_week]}: break must be within open/close hours.`;
    }
  }
  return null;
}

function parseTime(s: string): number | null {
  if (s == null || typeof s !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export default function AdminBusinessHours() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { data: hoursRows, isLoading, upsert, upserting } = useBusinessHours();
  const { openState } = useRestaurantOpenState();
  const [days, setDays] = useState<BusinessHoursDay[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isAdmin) navigate('/auth');
  }, [loading, user, isAdmin, navigate]);

  useEffect(() => {
    if (hoursRows == null) return;
    if (hoursRows.length === 0) {
      setDays(DAY_ORDER.map((dow) => defaultDay(dow)));
      return;
    }
    const byDay = new Map(hoursRows.map((r) => [r.day_of_week, r]));
    setDays(
      DAY_ORDER.map((dow) => {
        const existing = byDay.get(dow);
        if (existing) return { ...existing };
        return defaultDay(dow);
      })
    );
  }, [hoursRows]);

  const handleSave = async () => {
    const err = validateDays(days);
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      await upsert(days);
      toast.success('Business hours saved.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (dayOfWeek: number, patch: Partial<BusinessHoursDay>) => {
    setDays((prev) =>
      prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, ...patch } : d))
    );
  };

  if (loading || !user || !isAdmin) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Business Hours
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set opening hours and optional break for each day. Customers cannot place orders when closed.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current status</CardTitle>
          <CardDescription>
            {openState.isOpen
              ? 'Restaurant is open – ordering is allowed.'
              : openState.statusMessage}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly schedule</CardTitle>
          <CardDescription>
            Configure open/close and optional break for each day. Leave a day closed to disable ordering that day.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {days.map((d) => (
                <div
                  key={d.day_of_week}
                  className="flex flex-wrap items-end gap-4 rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <Switch
                      id={`open-${d.day_of_week}`}
                      checked={d.is_open}
                      onCheckedChange={(v) =>
                        updateDay(d.day_of_week, {
                          is_open: v,
                          open_time: v ? d.open_time ?? '08:00' : null,
                          close_time: v ? d.close_time ?? '23:00' : null,
                          break_start: null,
                          break_end: null,
                        })
                      }
                    />
                    <Label htmlFor={`open-${d.day_of_week}`} className="font-medium">
                      {DAY_LABELS[d.day_of_week]}
                    </Label>
                  </div>
                  {d.is_open && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Open</Label>
                        <Input
                          type="time"
                          value={timeToInput(d.open_time)}
                          onChange={(e) => updateDay(d.day_of_week, { open_time: e.target.value || null })}
                          className="w-28"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Close</Label>
                        <Input
                          type="time"
                          value={timeToInput(d.close_time)}
                          onChange={(e) => updateDay(d.day_of_week, { close_time: e.target.value || null })}
                          className="w-28"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Break start</Label>
                        <Input
                          type="time"
                          value={timeToInput(d.break_start)}
                          onChange={(e) => updateDay(d.day_of_week, { break_start: e.target.value || null })}
                          className="w-28"
                          placeholder="Optional"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">Break end</Label>
                        <Input
                          type="time"
                          value={timeToInput(d.break_end)}
                          onChange={(e) => updateDay(d.day_of_week, { break_end: e.target.value || null })}
                          className="w-28"
                          placeholder="Optional"
                        />
                      </div>
                    </>
                  )}
                  {!d.is_open && (
                    <span className="text-sm text-muted-foreground">Closed all day</span>
                  )}
                </div>
              ))}
              <Button onClick={handleSave} disabled={saving || upserting}>
                {(saving || upserting) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save business hours
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
