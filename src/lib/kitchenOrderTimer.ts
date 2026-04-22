import type { Order } from '@/types';

export const KITCHEN_TIMER_CAP_MS = 20 * 60 * 1000;

function parseMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

/** preparing_started_at, или created_at (редослед од барањето) */
export function kitchenTimerStartMs(order: Order): number {
  const prep = parseMs(order.preparing_started_at);
  if (prep != null) return prep;
  return new Date(order.created_at).getTime();
}

/** End of prep window for READY: `ready_at` only (no wall clock). */
export function kitchenTimerEndMsReady(order: Order): number | null {
  return parseMs(order.ready_at);
}

/** Жив елпс за PREPARING (или за преод без refetch на preparing_started_at). */
export function kitchenElapsedMsWhileOpen(order: Order, nowMs: number): number | null {
  if (order.status !== 'PREPARING' || !Number.isFinite(nowMs)) return null;
  const start = kitchenTimerStartMs(order);
  return Math.min(Math.max(0, nowMs - start), KITCHEN_TIMER_CAP_MS);
}

/** Замрзнат елпс за завршена READY нарачка; не зависи од now. */
export function kitchenElapsedMsFrozenReady(order: Order): number | null {
  if (order.status !== 'READY') return null;
  const end = kitchenTimerEndMsReady(order);
  if (end == null) return null;
  const start = kitchenTimerStartMs(order);
  return Math.min(Math.max(0, end - start), KITCHEN_TIMER_CAP_MS);
}

/** За откажано по подготовка: canceled_at − start. */
export function kitchenElapsedMsFrozenCanceled(order: Order): number | null {
  if (order.status !== 'CANCELED') return null;
  const end = parseMs(order.canceled_at);
  if (end == null) return null;
  const start = kitchenTimerStartMs(order);
  return Math.min(Math.max(0, end - start), KITCHEN_TIMER_CAP_MS);
}

/** Live prep elapsed for UI tickers; frozen DB-only duration when status is READY. */
export function customerPrepElapsedMs(order: Order, nowMs: number): number | null {
  if (order.status === 'READY') {
    return kitchenElapsedMsFrozenReady(order);
  }
  if (order.status === 'PREPARING') {
    return kitchenElapsedMsWhileOpen(order, nowMs);
  }
  return null;
}

/** m:ss (or h:mm:ss if over an hour), capped — same convention as kitchen cards. */
export function formatKitchenPrepElapsedMs(ms: number): string {
  const capped = Math.min(Math.max(0, ms), KITCHEN_TIMER_CAP_MS);
  const totalSeconds = Math.floor(capped / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
