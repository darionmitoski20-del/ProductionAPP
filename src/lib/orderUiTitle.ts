import type { TFunction } from 'i18next';

/**
 * Card/page heading for an order: "Order for {name}" or "Order" if the name is missing.
 */
export function formatOrderUiTitle(customerName: string | null | undefined, t: TFunction): string {
  const name = customerName?.trim();
  if (!name) return t('common.orderTitleFallback');
  return t('common.orderTitleFor', { name });
}
