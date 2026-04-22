const ORDER_HISTORY_KEY = 'fastbite:orderHistory';
export const ORDER_HISTORY_CHANGED_EVENT = 'fastbite:order-history-changed';

export interface OrderHistoryEntry {
  orderId: string;
  createdAt: string;
}

export function getOrderHistorySession(): OrderHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(ORDER_HISTORY_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        const row = item as { orderId?: unknown; createdAt?: unknown };
        if (typeof row.orderId !== 'string' || !row.orderId) return null;
        return {
          orderId: row.orderId,
          createdAt:
            typeof row.createdAt === 'string' && row.createdAt
              ? row.createdAt
              : new Date().toISOString(),
        };
      })
      .filter((x): x is OrderHistoryEntry => x !== null);
  } catch {
    return [];
  }
}

export function addOrderToHistorySession(orderId: string, createdAt?: string): void {
  if (typeof window === 'undefined') return;
  const current = getOrderHistorySession().filter((x) => x.orderId !== orderId);
  const next: OrderHistoryEntry[] = [
    { orderId, createdAt: createdAt ?? new Date().toISOString() },
    ...current,
  ].slice(0, 25);
  window.localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(ORDER_HISTORY_CHANGED_EVENT));
}

export function clearOrderHistorySession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ORDER_HISTORY_KEY);
  window.dispatchEvent(new Event(ORDER_HISTORY_CHANGED_EVENT));
}
