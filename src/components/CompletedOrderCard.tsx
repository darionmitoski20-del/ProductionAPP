import { useTranslation } from 'react-i18next';
import { Order } from '@/types';
import { formatPrice } from '@/lib/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Phone, User, UserCircle } from 'lucide-react';
import { format } from 'date-fns';
import { formatOrderUiTitle } from '@/lib/orderUiTitle';
import { completedOrderStaffLine } from '@/lib/orderStaffLine';
import { kitchenElapsedMsFrozenCanceled, kitchenElapsedMsFrozenReady } from '@/lib/kitchenOrderTimer';

interface CompletedOrderCardProps {
  order: Order;
}

function computeKitchenDurationMs(order: Order): number {
  const readyMs = kitchenElapsedMsFrozenReady(order);
  if (readyMs != null) return readyMs;
  const canceledMs = kitchenElapsedMsFrozenCanceled(order);
  if (canceledMs != null) return canceledMs;
  return 0;
}

function formatKitchenDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const CompletedOrderCard = ({ order }: CompletedOrderCardProps) => {
  const { t } = useTranslation();
  const isCanceled = order.status === 'CANCELED';

  const finishedAt = isCanceled
    ? order.canceled_at ?? order.updated_at
    : order.confirmed_at ?? order.updated_at;

  const actorEmail = isCanceled
    ? order.canceled_by_email ?? order.canceled_by ?? '—'
    : order.confirmed_by_email ?? order.confirmed_by ?? '—';

  const kitchenDurationMs = computeKitchenDurationMs(order);
  const staffLine = completedOrderStaffLine(order, t);

  return (
    <Card className="rounded-xl shadow-sm border bg-card">
      <CardHeader className="pb-2 sm:pb-3 px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm sm:text-base font-semibold truncate">
            {formatOrderUiTitle(order.customer_name, t)}
          </CardTitle>
          <div className="flex flex-col items-end gap-0.5">
            <Badge
              className={
                isCanceled
                  ? 'bg-destructive/10 text-destructive border border-destructive/40'
                  : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/40 dark:text-emerald-400'
              }
            >
              {isCanceled ? t('admin.completedCard.canceled') : t('admin.completedCard.completed')}
            </Badge>
            {kitchenDurationMs > 0 && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {t('admin.completedCard.kitchenTime', {
                  duration: formatKitchenDuration(kitchenDurationMs),
                })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] sm:text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {format(new Date(order.created_at), 'MMM d, HH:mm')}
          </div>
          {order.customer_name && (
            <div className="flex items-center gap-1 max-w-[50%] sm:max-w-none truncate">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{order.customer_name}</span>
            </div>
          )}
          {order.phone && (
            <div className="flex items-center gap-1 max-w-[40%] sm:max-w-none truncate">
              <Phone className="h-3.5 w-3.5" />
              <span className="truncate">{order.phone}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4 px-3 pb-3 pt-1 sm:px-4 sm:pb-4 sm:pt-0">
        {/* Staff: who marked ready / handled cancel */}
        <div className="flex items-center gap-2 text-xs min-w-0">
          <UserCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={1.75} aria-hidden />
          <span className="font-medium truncate">{staffLine}</span>
        </div>

        {/* Items */}
        <div className="space-y-1.5 sm:space-y-2 text-xs">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between gap-2">
              <div className="min-w-0">
                <span className="font-medium">
                  {item.quantity}× {item.product_name}
                </span>
                {item.addons && item.addons.length > 0 && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    + {item.addons.map((a: any) => a.name).join(', ')}
                  </p>
                )}
                {item.comment && (
                  <p className="text-[11px] text-accent italic truncate">
                    "{item.comment}"
                  </p>
                )}
              </div>
              <span className="text-muted-foreground whitespace-nowrap">
                {formatPrice(item.subtotal)}
              </span>
            </div>
          ))}
        </div>

        {/* Audit line */}
        {finishedAt && (
          <div className="text-[11px] text-muted-foreground">
            {isCanceled
              ? t('admin.completedCard.auditCanceled', {
                  who: actorEmail,
                  time: format(new Date(finishedAt), 'MMM d, HH:mm'),
                })
              : t('admin.completedCard.auditCompleted', {
                  who: actorEmail,
                  time: format(new Date(finishedAt), 'MMM d, HH:mm'),
                })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            {formatPrice(order.total)}
          </span>
          <span className="text-muted-foreground text-xs">
            ▾
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
