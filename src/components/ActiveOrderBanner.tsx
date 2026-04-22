import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useOrder } from '@/hooks/useOrders';
import { useActiveOrderSession } from '@/hooks/useActiveOrderSession';
import { isAuthOrMissingOrderError, isCustomerActiveOrderStatus } from '@/lib/activeOrderSession';
import { PackageCheck, ArrowRight, X } from 'lucide-react';
import { formatOrderUiTitle } from '@/lib/orderUiTitle';

export const ActiveOrderBanner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orderId, hasActiveOrder, clearActiveOrder } = useActiveOrderSession();
  const { data: order, isError, error, isPending } = useOrder(orderId ?? null);

  useEffect(() => {
    if (!order) return;
    if (!isCustomerActiveOrderStatus(order.status)) {
      clearActiveOrder();
    }
  }, [order, clearActiveOrder]);

  useEffect(() => {
    if (!isError) return;
    if (isAuthOrMissingOrderError(error)) {
      clearActiveOrder();
    }
  }, [isError, error, clearActiveOrder]);

  if (!hasActiveOrder || !orderId) return null;
  if (isPending || !order) return null;
  if (!isCustomerActiveOrderStatus(order.status)) return null;

  const orderLabel = formatOrderUiTitle(order.customer_name, t);

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/95 to-white px-3 py-2.5 shadow-sm sm:mb-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3">
      <div className="flex min-w-0 items-start gap-2 sm:gap-2.5">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 sm:h-8 sm:w-8">
          <PackageCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-900 leading-tight">
            {t('activeOrder.title')}
          </p>
          <p className="text-xs text-emerald-800/80 mt-0.5">
            {t('activeOrder.subtitle', { label: orderLabel })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:ml-auto">
        <Button
          size="sm"
          className="min-w-[110px]"
          onClick={() => navigate(`/order/${orderId}`)}
        >
          <ArrowRight className="h-4 w-4 mr-1.5" />
          {t('activeOrder.track')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/orders')}>
          {t('activeOrder.history')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={clearActiveOrder}
        >
          <X className="h-4 w-4 mr-1.5" />
          {t('activeOrder.dismiss')}
        </Button>
      </div>
    </div>
  );
};
