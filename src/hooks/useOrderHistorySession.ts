import { useCallback, useEffect, useState } from 'react';
import {
  addOrderToHistorySession,
  clearOrderHistorySession,
  getOrderHistorySession,
  ORDER_HISTORY_CHANGED_EVENT,
  type OrderHistoryEntry,
} from '@/lib/orderHistorySession';

export function useOrderHistorySession() {
  const [history, setHistory] = useState<OrderHistoryEntry[]>(() => getOrderHistorySession());

  const sync = useCallback(() => {
    setHistory(getOrderHistorySession());
  }, []);

  useEffect(() => {
    sync();
    const onChange = () => sync();
    window.addEventListener('storage', onChange);
    window.addEventListener(ORDER_HISTORY_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(ORDER_HISTORY_CHANGED_EVENT, onChange);
    };
  }, [sync]);

  return {
    history,
    hasHistory: history.length > 0,
    addOrderToHistory: addOrderToHistorySession,
    clearHistory: clearOrderHistorySession,
  };
}
