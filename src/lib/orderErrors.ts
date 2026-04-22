import type { RestaurantStatusI18n } from '@/types';

export class OrderClosedError extends Error {
  readonly statusI18n: RestaurantStatusI18n;

  constructor(statusI18n: RestaurantStatusI18n) {
    super('ORDER_CLOSED');
    this.name = 'OrderClosedError';
    this.statusI18n = statusI18n;
  }
}

export function isOrderClosedError(e: unknown): e is OrderClosedError {
  return e instanceof OrderClosedError;
}
