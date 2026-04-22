import { useTranslation } from 'react-i18next';
import { Order, OrderStatus } from '@/types';
import { formatPrice } from '@/lib/currency';
import { useCancelOrder, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Phone, User, Package, X, ClipboardList, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { playKitchenNewOrderSound } from '@/lib/notificationSound';
import { formatOrderUiTitle } from '@/lib/orderUiTitle';
import {
  kitchenElapsedMsFrozenReady,
  kitchenElapsedMsWhileOpen,
  KITCHEN_TIMER_CAP_MS,
} from '@/lib/kitchenOrderTimer';

interface KitchenOrderCardProps {
  order: Order;
  /** Show "New" badge and highlight (e.g. for just-received orders). */
  isNew?: boolean;
  /** Current time in ms for live elapsed timer. If set, shows mm:ss (or hh:mm:ss) with color. */
  now?: number;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-500 text-white',
  ACCEPTED: 'bg-primary text-primary-foreground',
  PREPARING: 'bg-primary text-primary-foreground',
  READY: 'bg-success text-success-foreground',
  CANCELED: 'bg-destructive text-destructive-foreground',
};

function formatElapsed(ms: number): string {
  const capped = Math.min(ms, KITCHEN_TIMER_CAP_MS);
  const totalSeconds = Math.floor(capped / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function elapsedColorClass(elapsedMs: number): string {
  const min = elapsedMs / 60000;
  if (min < 5) return 'text-green-600 dark:text-green-400';
  if (min < 10) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export const KitchenOrderCard = ({ order, isNew, now }: KitchenOrderCardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const cancelOrder = useCancelOrder();
  const updateStatus = useUpdateOrderStatus();

  let displayElapsedMs = 0;
  let showTimer = false;
  if (order.status === 'PREPARING' && now != null) {
    const live = kitchenElapsedMsWhileOpen(order, now);
    if (live != null) {
      displayElapsedMs = live;
      showTimer = true;
    }
  } else if (order.status === 'READY') {
    const frozen = kitchenElapsedMsFrozenReady(order);
    if (frozen != null) {
      displayElapsedMs = frozen;
      showTimer = true;
    }
  }

  const handleStatusUpdate = (status: OrderStatus) => {
    const opts = {
      onSuccess: () => {
        if (status === 'READY') {
          toast.success(t('kitchen.orderReadyToast'));
          playKitchenNewOrderSound();
          return;
        }
        toast.success(
          t('kitchen.statusUpdated', {
            label: formatOrderUiTitle(order.customer_name, t),
            status: t(`admin.status.${status}`),
          })
        );
      },
      onError: (err: { message?: string }) =>
        toast.error(err?.message ?? t('kitchen.statusUpdateFailed')),
    };
    if (status === 'CANCELED') {
      cancelOrder.mutate(
        { orderId: order.id, callerEmail: user?.email ?? null },
        opts
      );
      return;
    }
    updateStatus.mutate({ orderId: order.id, status }, opts);
  };

  const isPending = cancelOrder.isPending || updateStatus.isPending;

  const getNextAction = (): { label: string; status: OrderStatus; icon: React.ReactNode } | null => {
    switch (order.status) {
      case 'PENDING':
        return { label: t('kitchen.approve'), status: 'ACCEPTED', icon: <Package className="h-5 w-5" /> };
      case 'ACCEPTED':
        return { label: t('kitchen.startPreparing'), status: 'PREPARING', icon: <Package className="h-5 w-5" /> };
      case 'PREPARING':
        return { label: t('kitchen.ready'), status: 'READY', icon: <Package className="h-5 w-5" /> };
      case 'READY':
      case 'CANCELED':
        return null;
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <Card
      className={cn(
        'animate-slide-in shadow-card',
        isNew && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <CardHeader className="pb-2 sm:pb-3 px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle className="text-lg sm:text-xl font-bold truncate">
              {formatOrderUiTitle(order.customer_name, t)}
            </CardTitle>
            {isNew && (
              <Badge variant="secondary" className="bg-primary/20 text-primary font-semibold">
                {t('kitchen.badgeNew')}
              </Badge>
            )}
          </div>
          <Badge className={STATUS_COLORS[order.status]}>
            {t(`admin.status.${order.status}`)}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{format(new Date(order.created_at), 'HH:mm')}</span>
            {showTimer && (
              <span className={cn('ml-1 font-medium tabular-nums', elapsedColorClass(displayElapsedMs))}>
                {formatElapsed(displayElapsedMs)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 max-w-[50%] sm:max-w-none truncate">
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="truncate">{order.customer_name}</span>
          </div>
          <div className="flex items-center gap-1 max-w-[40%] sm:max-w-none truncate">
            <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="truncate">{order.phone}</span>
          </div>
        </div>
        {order.pickup_time && (
          <div className="text-sm font-medium text-primary mt-1">
            {t('kitchen.pickupAt', { time: format(new Date(order.pickup_time), 'HH:mm') })}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4 px-3 pb-3 sm:px-4 sm:pb-4">
        {/* Order Items */}
        <div className="space-y-1.5 sm:space-y-2">
          {order.items?.map((item) => (
            <div key={item.id} className="p-2.5 sm:p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-base sm:text-lg">
                    {item.quantity}×
                  </span>
                  <span className="font-medium ml-2 text-sm sm:text-base truncate block">
                    {item.product_name}
                  </span>
                </div>
                <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  {formatPrice(item.subtotal)}
                </span>
              </div>
              {item.addons && item.addons.length > 0 && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-2">
                  + {item.addons.map((a: any) => a.name).join(', ')}
                </p>
              )}
              {item.comment && (
                <p className="flex items-start gap-1.5 text-xs sm:text-sm text-accent mt-0.5 font-medium line-clamp-2">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" strokeWidth={1.75} aria-hidden />
                  <span>{item.comment}</span>
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Order Note */}
        {order.order_note && (
          <div className="flex gap-2 p-2.5 sm:p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <ClipboardList className="h-4 w-4 shrink-0 text-warning mt-0.5" strokeWidth={1.75} aria-hidden />
            <p className="text-xs sm:text-sm font-medium min-w-0">{order.order_note}</p>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm sm:text-base font-medium">{t('kitchen.total')}</span>
          <span className="text-lg sm:text-xl font-bold text-primary">
            {formatPrice(order.total)}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {nextAction && (
            <Button
              className="flex-1 min-h-[44px] text-sm sm:text-base font-semibold"
              onClick={() => handleStatusUpdate(nextAction.status)}
              disabled={isPending}
            >
              {nextAction.icon}
              <span className="ml-2">{nextAction.label}</span>
            </Button>
          )}
          {(order.status === 'PENDING' || order.status === 'ACCEPTED' || order.status === 'PREPARING') && (
            <Button
              variant="destructive"
              className="min-w-[44px] min-h-[44px]"
              onClick={() => handleStatusUpdate('CANCELED')}
              disabled={isPending}
              aria-label={t('kitchen.cancelTooltip')}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
