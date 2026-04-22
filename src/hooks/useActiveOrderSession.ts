import { useCallback, useEffect, useState } from 'react';
import {
  clearActiveOrderSession,
  getActiveOrderSession,
  setActiveOrderSession,
  type ActiveOrderSession,
} from '@/lib/activeOrderSession';

export function useActiveOrderSession() {
  const [session, setSession] = useState<ActiveOrderSession>(() => getActiveOrderSession());

  const syncFromStorage = useCallback(() => {
    setSession(getActiveOrderSession());
  }, []);

  useEffect(() => {
    syncFromStorage();
    const onStorage = () => syncFromStorage();
    window.addEventListener('storage', onStorage);
    window.addEventListener('fastbite:active-order-changed', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('fastbite:active-order-changed', onStorage);
    };
  }, [syncFromStorage]);

  const setActive = useCallback((orderId: string, createdAtIso?: string) => {
    setActiveOrderSession(orderId, createdAtIso);
    syncFromStorage();
  }, [syncFromStorage]);

  const clearActive = useCallback(() => {
    clearActiveOrderSession();
    syncFromStorage();
  }, [syncFromStorage]);

  return {
    orderId: session.orderId,
    createdAt: session.createdAt,
    hasActiveOrder: Boolean(session.orderId),
    setActiveOrder: setActive,
    clearActiveOrder: clearActive,
  };
}

