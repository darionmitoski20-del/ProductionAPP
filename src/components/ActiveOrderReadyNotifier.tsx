import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrder } from '@/hooks/useOrders';
import { useActiveOrderSession } from '@/hooks/useActiveOrderSession';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  attachSilentAudioUnlockOnFirstInteraction,
  playOrderReadyNotificationSound,
} from '@/lib/notificationSound';

/**
 * Shows the “order ready” modal + sound on any route while an active order exists in session
 * (set from Cart on place order). Shares React Query cache with `/order/:id`.
 */
export function ActiveOrderReadyNotifier() {
  const { t } = useTranslation();
  const { orderId, clearActiveOrder } = useActiveOrderSession();
  const { data: order } = useOrder(orderId);
  const previousStatusRef = useRef<string | null>(null);
  const notifiedReadyOrderIdsRef = useRef<Set<string>>(new Set());
  const [readyModalOpen, setReadyModalOpen] = useState(false);

  useEffect(() => {
    attachSilentAudioUnlockOnFirstInteraction();
  }, []);

  useEffect(() => {
    notifiedReadyOrderIdsRef.current = new Set();
    previousStatusRef.current = null;
  }, [orderId]);

  useEffect(() => {
    if (!order || !orderId) return;

    if (order.status === 'CANCELED') {
      clearActiveOrder();
      previousStatusRef.current = order.status;
      return;
    }

    const prev = previousStatusRef.current;
    previousStatusRef.current = order.status;

    if (order.status !== 'READY') return;
    if (prev === 'READY') return;
    if (prev === null) return;

    if (notifiedReadyOrderIdsRef.current.has(order.id)) return;
    notifiedReadyOrderIdsRef.current.add(order.id);

    setReadyModalOpen(true);
    playOrderReadyNotificationSound();

    const title = t('orderTracking.notifyTitle');
    const body = t('orderTracking.notifyBody');
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, { body });
        } catch {
          /* ignore */
        }
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((p) => {
          if (p === 'granted') {
            try {
              new Notification(title, { body });
            } catch {
              /* ignore */
            }
          }
        });
      }
    }

    clearActiveOrder();
  }, [order, orderId, clearActiveOrder, t]);

  return (
    <Dialog open={readyModalOpen} onOpenChange={setReadyModalOpen}>
      <DialogContent className="w-[93vw] max-w-[93vw] gap-5 p-6 shadow-2xl sm:w-full sm:max-w-md pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <DialogHeader className="space-y-3 sm:text-left">
          <DialogTitle className="text-lg leading-snug sm:text-xl pr-8 text-center sm:text-left text-balance">
            {t('orderTracking.modalReadyTitle')}
          </DialogTitle>
          <DialogDescription className="text-[15px] sm:text-base leading-relaxed text-foreground pt-0 text-center sm:text-left">
            {t('orderTracking.modalReadyMessage')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center sm:space-x-0">
          <Button
            type="button"
            className="min-h-[48px] w-full sm:min-h-[44px] sm:w-auto"
            onClick={() => setReadyModalOpen(false)}
          >
            {t('orderTracking.readyModalDismiss')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
