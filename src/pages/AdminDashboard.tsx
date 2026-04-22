import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import {
  useDashboardStats,
  useRecentOrders,
  useTrendingItems,
} from '@/hooks/useDashboard';
import { StatCard, StatusBadge } from '@/components/admin';
import { formatPrice } from '@/lib/currency';
import { formatOrderUiTitle } from '@/lib/orderUiTitle';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, ShoppingBag, Clock, Users, Loader2, ArrowRight } from 'lucide-react';
export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentOrders, isLoading: ordersLoading } = useRecentOrders(5);
  const { data: trending, isLoading: trendingLoading } = useTrendingItems(5);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user && !isAdmin) navigate('/auth');
  }, [loading, user, isAdmin, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const maxSold = trending?.length ? Math.max(...trending.map((t) => t.sold), 1) : 1;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('admin.dashboard.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.dashboard.subtitle')}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {statsLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              title={t('admin.dashboard.todayRevenue')}
              value={stats ? formatPrice(stats.todayRevenue) : '—'}
              icon={DollarSign}
            />
            <StatCard
              title={t('admin.dashboard.ordersToday')}
              value={stats?.ordersToday ?? '—'}
              icon={ShoppingBag}
            />
            <StatCard
              title={t('admin.dashboard.pendingOrders')}
              value={stats?.pendingOrdersToday ?? '—'}
              icon={Clock}
            />
            <StatCard
              title={t('admin.dashboard.activeUsers')}
              value={stats?.activeUsers ?? '—'}
              icon={Users}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm overflow-hidden min-h-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">{t('admin.dashboard.recentOrders')}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/orders">
                {t('admin.dashboard.viewAll')}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="overflow-x-auto -mx-px">
            {ordersLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : !recentOrders?.length ? (
              <p className="p-5 text-sm text-muted-foreground">{t('admin.dashboard.noOrders')}</p>
            ) : (
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.dashboard.thOrder')}</TableHead>
                    <TableHead>{t('admin.dashboard.thCustomer')}</TableHead>
                    <TableHead className="min-w-[120px] max-w-[200px]">{t('admin.dashboard.thItems')}</TableHead>
                    <TableHead>{t('admin.dashboard.thStatus')}</TableHead>
                    <TableHead className="text-right">{t('admin.dashboard.thTotal')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {formatOrderUiTitle(order.customer_name, t)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {order.customer_name?.trim() || t('admin.dashboard.guest')}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm break-words align-top min-w-[120px] max-w-[200px]">
                        {order.items_summary}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(order.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Trending Items */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">{t('admin.dashboard.trending')}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('admin.dashboard.trendingSubtitle')}
            </p>
          </div>
          <div className="p-5 space-y-4">
            {trendingLoading ? (
              [...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))
            ) : !trending?.length ? (
              <p className="text-sm text-muted-foreground">{t('admin.dashboard.noTrending')}</p>
            ) : (
              trending.map((item) => (
                <div key={item.product_id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground truncate pr-2">
                      {item.displayName}
                    </span>
                    <span className="text-muted-foreground flex-shrink-0">
                      {t('admin.dashboard.sold', { n: item.sold })}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(100, (item.sold / maxSold) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
