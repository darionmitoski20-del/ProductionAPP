import type { OrderStatus } from '@/types';

const LAST_ORDER_ID_KEY = 'fastbite:lastOrderId';
const LAST_ORDER_CREATED_AT_KEY = 'fastbite:lastOrderCreatedAt';

/** Customer “in progress” — show active-order banner / keep session only for these. */
export const CUSTOMER_ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'ACCEPTED',
  'PREPARING',
];

export function isCustomerActiveOrderStatus(status: OrderStatus): boolean {
  return CUSTOMER_ACTIVE_ORDER_STATUSES.includes(status);
}

export interface ActiveOrderSession {
  orderId: string | null;
  createdAt: string | null;
}

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(key);
}

export function getActiveOrderSession(): ActiveOrderSession {
  return {
    orderId: readStorage(LAST_ORDER_ID_KEY),
    createdAt: readStorage(LAST_ORDER_CREATED_AT_KEY),
  };
}

export function setActiveOrderSession(orderId: string, createdAtIso?: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LAST_ORDER_ID_KEY, orderId);
  window.localStorage.setItem(LAST_ORDER_CREATED_AT_KEY, createdAtIso ?? new Date().toISOString());
  window.dispatchEvent(new Event('fastbite:active-order-changed'));
}

export function clearActiveOrderSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LAST_ORDER_ID_KEY);
  window.localStorage.removeItem(LAST_ORDER_CREATED_AT_KEY);
  window.dispatchEvent(new Event('fastbite:active-order-changed'));
}

export function isAuthOrMissingOrderError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; status?: number; message?: string };

  // PostgREST: no rows for .single()
  if (e.code === 'PGRST116') return true;
  if (e.status === 401 || e.status === 403 || e.status === 404) return true;
  if (typeof e.message === 'string' && /jwt|unauthorized|forbidden|no rows/i.test(e.message)) {
    return true;
  }
  return false;
}

