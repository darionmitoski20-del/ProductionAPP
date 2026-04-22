import type { TFunction } from 'i18next';
import type { Order } from '@/types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function staffName(order: Order, mode: 'ready' | 'canceled'): string {
  const email = mode === 'canceled' ? order.canceled_by_email : order.confirmed_by_email;
  const idField = mode === 'canceled' ? order.canceled_by : order.confirmed_by;
  const fromEmail = email?.trim();
  if (fromEmail) return fromEmail;
  const raw = (typeof idField === 'string' ? idField : '').trim();
  if (!raw || UUID_RE.test(raw)) return '—';
  return raw;
}

/** Label for kitchen / completed cards: who finished preparation (READY) or who handled cancellation (CANCELED). */
export function completedOrderStaffLine(order: Order, t: TFunction): string {
  const isCanceled = order.status === 'CANCELED';
  const name = staffName(order, isCanceled ? 'canceled' : 'ready');
  return isCanceled
    ? t('admin.completedCard.handledBy', { name })
    : t('admin.completedCard.preparedBy', { name });
}
