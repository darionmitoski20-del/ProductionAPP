import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { Order, OrderStatus } from '@/types';
import { CompletedOrderCard } from '@/components/CompletedOrderCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LogOut, Settings, Home, Users, Loader2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; status?: number; message?: string };
  if (e.code === 'PGRST301' || e.status === 401 || e.status === 403) return true;
  if (typeof e.message === 'string' && /jwt|unauthorized|forbidden/i.test(e.message)) return true;
  return false;
}

const KitchenCompleted = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading, isStaff, role, signOut } = useAuth();
  const { data: orders, isLoading, isError, error, refetch } = useOrders();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (isError && isAuthError(error)) {
      navigate('/auth', { replace: true });
    }
  }, [isError, error, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const { finishedOrders, finishedCount } = useMemo(() => {
    const list = orders ?? [];

    const filterByStatus = (statuses: OrderStatus[]) =>
      list.filter((o) => statuses.includes(o.status));

    const done = filterByStatus(['READY', 'CANCELED']).slice().sort((a: Order, b: Order) => {
      const aFinished = (a.canceled_at ?? a.updated_at) ?? a.created_at;
      const bFinished = (b.canceled_at ?? b.updated_at) ?? b.created_at;
      return new Date(bFinished).getTime() - new Date(aFinished).getTime();
    });

    return {
      finishedOrders: done,
      finishedCount: done.length,
    };
  }, [orders]);

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h1 className="text-2xl font-bold mb-2">{t('kitchenCompleted.accessDenied')}</h1>
        <p className="text-muted-foreground mb-6">{t('kitchenCompleted.noPermission')}</p>
        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            {t('kitchenCompleted.backHome')}
          </Link>
        </Button>
      </div>
    );
  }

  const renderTabsBar = () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 border-b pb-2">
      <div className="flex gap-1 text-xs sm:text-sm">
        <button
          type="button"
          className={cn(
            'px-3 py-1.5 rounded-full font-medium',
            'bg-primary text-primary-foreground'
          )}
        >
          {t('kitchenCompleted.completed')}
          <Badge className="ml-2 text-xs px-2 py-0.5 bg-emerald-500 text-emerald-50">
            {finishedCount}
          </Badge>
        </button>
      </div>
      <button
        type="button"
        className={cn(
          'px-3 py-1.5 rounded-full font-medium text-xs sm:text-sm',
          'text-muted-foreground hover:text-foreground self-start sm:self-auto',
        )}
        onClick={() => navigate('/admin')}
      >
        <Users className="h-4 w-4 inline mr-1" />
        {t('kitchenCompleted.staffUsers')}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Logo />
            <span className="text-sm font-medium text-muted-foreground">{t('kitchenCompleted.ordersHeader')}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher variant="header" />
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {user?.email} ({role ?? '—'})
            </span>
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/kitchen">
                <Settings className="mr-2 h-4 w-4" />
                {t('kitchenCompleted.liveBoard')}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                {t('kitchenCompleted.customerMenu')}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[36px]"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('kitchenCompleted.signOut')}
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-3 sm:px-4 py-4 sm:py-6">
        {renderTabsBar()}

        <button
          type="button"
          onClick={() => navigate('/kitchen')}
          className="mb-4 text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <span className="text-lg">{'\u2190'}</span>
          <span>{t('kitchenCompleted.backLiveBoard')}</span>
        </button>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-6 flex flex-col items-center justify-center gap-4">
            <p className="text-destructive font-medium">{t('kitchenCompleted.loadFailed')}</p>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : t('kitchenCompleted.unknownError')}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                {t('kitchenCompleted.retry')}
              </Button>
              <Button variant="default" onClick={() => navigate('/auth')}>
                {t('kitchenCompleted.signInAgain')}
              </Button>
            </div>
          </div>
        ) : finishedOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">{t('kitchenCompleted.emptyCompleted')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {finishedOrders.map((order) => (
              <CompletedOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default KitchenCompleted;
