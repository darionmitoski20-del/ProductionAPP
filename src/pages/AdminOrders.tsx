import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { AdminOrderCard } from '@/components/AdminOrderCard';
import { OrderStatus } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-12 text-muted-foreground">
    <p className="text-lg">{message}</p>
  </div>
);

export default function AdminOrders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('accepted');
  const { data: orders, isLoading } = useOrders();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isAdmin) navigate('/auth');
  }, [loading, user, isAdmin, navigate]);

  const filterOrders = (statuses: OrderStatus[]) =>
    orders?.filter((o) => statuses.includes(o.status)) ?? [];
  const acceptedOrders = filterOrders(['PENDING', 'ACCEPTED']);
  const preparingOrders = filterOrders(['PREPARING']);
  const readyOrders = filterOrders(['READY']);
  const canceledOrders = filterOrders(['CANCELED']);

  if (loading || (!user && !loading)) return null;
  if (!user || !isAdmin) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t('admin.orders.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.orders.subtitle')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
          <TabsTrigger value="accepted" className="relative">
            {t('admin.orders.tabAccepted')}
            {acceptedOrders.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {acceptedOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="preparing">
            {t('admin.orders.tabPreparing')}
            {preparingOrders.length > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                {preparingOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ready">
            {t('admin.orders.tabReady')}
            {readyOrders.length > 0 && (
              <span className="ml-2 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {readyOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="canceled">{t('admin.orders.tabCanceled')}</TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            <TabsContent value="accepted">
              {acceptedOrders.length === 0 ? (
                <EmptyState message={t('admin.orders.emptyAccepted')} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {acceptedOrders.map((order) => (
                    <AdminOrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="preparing">
              {preparingOrders.length === 0 ? (
                <EmptyState message={t('admin.orders.emptyPreparing')} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {preparingOrders.map((order) => (
                    <AdminOrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="ready">
              {readyOrders.length === 0 ? (
                <EmptyState message={t('admin.orders.emptyReadyPickup')} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {readyOrders.map((order) => (
                    <AdminOrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="canceled">
              {canceledOrders.length === 0 ? (
                <EmptyState message={t('admin.orders.emptyCanceled')} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {canceledOrders.map((order) => (
                    <AdminOrderCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
