import type { Order } from '@/types';

const DEFAULT_PREPARING_DURATION_MINUTES = 15;

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getPreparingDurationMinutes(order: Order): number {
  return Math.max(1, order.preparing_duration_minutes ?? DEFAULT_PREPARING_DURATION_MINUTES);
}

export function getPreparingStartedAt(order: Order): Date | null {
  return toDate(order.preparing_started_at);
}

export function getReadyAt(order: Order): Date | null {
  return toDate(order.ready_at);
}

export interface OrderProgressComputed {
  etaAt: Date | null;
  remainingSeconds: number;
  /** 0 until PREPARING; animates 0–100 during PREPARING; 100 when READY */
  progressPercent: number;
}

/**
 * Customer progress bar: empty for PENDING/ACCEPTED, fills only while PREPARING, 100% at READY.
 */
export function computeOrderProgress(order: Order, now = new Date()): OrderProgressComputed {
  const nowMs = now.getTime();

  if (order.status === 'CANCELED') {
    return { etaAt: null, remainingSeconds: 0, progressPercent: 0 };
  }

  if (order.status === 'READY') {
    return {
      etaAt: getReadyAt(order),
      remainingSeconds: 0,
      progressPercent: 100,
    };
  }

  if (order.status === 'PENDING' || order.status === 'ACCEPTED') {
    return {
      etaAt: order.pickup_time ? toDate(order.pickup_time) : null,
      remainingSeconds: 0,
      progressPercent: 0,
    };
  }

  if (order.status === 'PREPARING') {
    const preparingStartedAt = getPreparingStartedAt(order);
    const preparingMinutes = getPreparingDurationMinutes(order);
    const preparingMs = preparingMinutes * 60 * 1000;

    if (!preparingStartedAt) {
      return {
        etaAt: null,
        remainingSeconds: 0,
        progressPercent: 0,
      };
    }

    const etaAt = new Date(preparingStartedAt.getTime() + preparingMs);
    const remainingSeconds = Math.max(0, Math.floor((etaAt.getTime() - nowMs) / 1000));
    const elapsed = Math.max(0, nowMs - preparingStartedAt.getTime());
    const ratio = Math.min(elapsed / preparingMs, 1);
    const progressPercent = ratio * 100;

    return {
      etaAt,
      remainingSeconds,
      progressPercent: Math.min(100, Math.max(0, progressPercent)),
    };
  }

  return { etaAt: null, remainingSeconds: 0, progressPercent: 0 };
}
