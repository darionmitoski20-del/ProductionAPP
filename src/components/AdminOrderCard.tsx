import { useTranslation } from 'react-i18next';
import { Order, OrderStatus } from '@/types';
import { formatPrice } from '@/lib/currency';
import { useCancelOrder, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Phone, User, MapPin, CheckCircle, XCircle, Zap, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { formatOrderUiTitle } from '@/lib/orderUiTitle';

interface AdminOrderCardProps {
  order: Order;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-500 text-white',
  ACCEPTED: 'bg-blue-500 text-white',
  PREPARING: 'bg-primary text-primary-foreground',
  READY: 'bg-success text-success-foreground',
  CANCELED: 'bg-destructive text-destructive-foreground',
};

const STATUSES: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'CANCELED'];

export const AdminOrderCard = ({ order }: AdminOrderCardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const cancelOrder = useCancelOrder();
  const updateStatus = useUpdateOrderStatus();
  const email = user?.email ?? null;

  const handleStatusChange = (status: OrderStatus) => {
    const payload = { orderId: order.id };
    const opts = {
      onSuccess: () =>
        toast.success(t('admin.adminOrder.updateSuccess', { label: formatOrderUiTitle(order.customer_name, t) })),
      onError: (err: { message?: string }) =>
        toast.error(err?.message ?? t('admin.adminOrder.updateFailed')),
    };
    if (status === 'CANCELED') {
      cancelOrder.mutate({ ...payload, callerEmail: email }, opts);
      return;
    }
    updateStatus.mutate({ ...payload, status }, opts);
  };

  const isPending = cancelOrder.isPending || updateStatus.isPending;

  const pickupLabel =
    order.pickup_time_option === 'asap'
      ? t('admin.adminOrder.asapPickup')
      : t('admin.adminOrder.pickupAt', {
          time: order.pickup_time ? format(new Date(order.pickup_time), 'HH:mm') : t('admin.adminOrder.pickupNA'),
        });

  return (
    <Card className="animate-slide-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{formatOrderUiTitle(order.customer_name, t)}</CardTitle>
          <Badge className={STATUS_COLORS[order.status]}>{t(`admin.status.${order.status}`)}</Badge>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {format(new Date(order.created_at), 'MMM d, HH:mm')}
          </div>
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {order.customer_name}
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-4 w-4" />
            {order.phone}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pickup Info */}
        <div className="flex items-center gap-2 text-sm">
          {order.pickup_time_option === 'asap' ? (
            <Zap className="h-4 w-4 text-primary shrink-0" strokeWidth={1.75} aria-hidden />
          ) : (
            <MapPin className="h-4 w-4 text-primary shrink-0" strokeWidth={1.75} aria-hidden />
          )}
          <span className="font-medium">{pickupLabel}</span>
        </div>

        {/* Order Items */}
        <div className="space-y-2 text-sm">
          {order.items?.map((item) => (
            <div key={item.id} className="flex justify-between">
              <div>
                <span className="font-medium">
                  {item.quantity}× {item.product_name}
                </span>
                {item.addons && item.addons.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    + {item.addons.map((a: any) => a.name).join(', ')}
                  </p>
                )}
                {item.comment && (
                  <p className="text-xs text-accent italic">"{item.comment}"</p>
                )}
              </div>
              <span className="text-muted-foreground">{formatPrice(item.subtotal)}</span>
            </div>
          ))}
        </div>

        {/* Order Note */}
        {order.order_note && (
          <div className="flex gap-2 p-2 bg-muted rounded text-sm">
            <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0">{order.order_note}</span>
          </div>
        )}

        {/* Audit: who confirmed / canceled */}
        {(order.confirmed_by_email ?? order.confirmed_at) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-success" />
            <span>
              {t('admin.adminOrder.confirmedBy', {
                who: order.confirmed_by_email ?? order.confirmed_by ?? '—',
              })}
              {order.confirmed_at
                ? t('admin.adminOrder.atTime', {
                    time: format(new Date(order.confirmed_at), 'MMM d, HH:mm'),
                  })
                : ''}
            </span>
          </div>
        )}
        {(order.canceled_by_email ?? order.canceled_at) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <XCircle className="h-4 w-4 text-destructive" />
            <span>
              {t('admin.adminOrder.canceledBy', {
                who: order.canceled_by_email ?? order.canceled_by ?? '—',
              })}
              {order.canceled_at
                ? t('admin.adminOrder.atTime', {
                    time: format(new Date(order.canceled_at), 'MMM d, HH:mm'),
                  })
                : ''}
            </span>
          </div>
        )}

        {/* Total & Status Control */}
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-lg font-bold text-primary">
            {formatPrice(order.total)}
          </span>
          <Select
            value={order.status}
            onValueChange={(value) => handleStatusChange(value as OrderStatus)}
            disabled={isPending}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {t(`admin.status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
