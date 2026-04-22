import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useOrderHistorySession } from '@/hooks/useOrderHistorySession';
import { useOrdersByIds } from '@/hooks/useOrders';
import type { OrderStatus } from '@/types';
import { format } from 'date-fns';
import { formatPrice } from '@/lib/currency';
import { ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';

export default function OrderHistory() {
  const { t } = useTranslation();
  const { history, hasHistory, clearHistory } = useOrderHistorySession();
  const { data: orders = [], isLoading } = useOrdersByIds(history.map((h) => h.orderId));

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <div className="container max-w-[760px] py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('orderHistory.backToMenu')}
          </Link>
          {hasHistory && (
            <Button variant="outline" size="sm" onClick={clearHistory}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              {t('orderHistory.clearHistory')}
            </Button>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h1 className="text-xl font-semibold">{t('orderHistory.title')}</h1>
          {!hasHistory ? (
            <p className="mt-3 text-sm text-muted-foreground">{t('orderHistory.empty')}</p>
          ) : isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">{t('orderHistory.loading')}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {orders.map((order) => (
                <li key={order.id} className="rounded-lg border px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t('orderHistory.orderFor', {
                        name: order.customer_name?.trim() || t('orderHistory.customerFallback'),
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.created_at), 'dd MMM yyyy, HH:mm')} •{' '}
                      {t(`admin.status.${order.status as OrderStatus}`)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatPrice(order.total)}</p>
                  <Link
                    to={`/order/${order.id}`}
                    className="inline-flex items-center text-xs text-primary hover:underline"
                  >
                    {t('orderHistory.open')}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
