import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/Logo';
import { KitchenOrderCard } from '@/components/KitchenOrderCard';
import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { useCurrentTime } from '@/hooks/useCurrentTime';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LogOut, Settings, Home, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  attachSilentAudioUnlockOnFirstInteraction,
  detachSilentAudioUnlockIfPending,
  playKitchenNewOrderSound,
} from '@/lib/notificationSound';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

/** Background refetch interval (2–3s) — no full page reload. */
const KITCHEN_POLL_MS = 2500;
const NEW_ORDER_BADGE_MS = 8000;
/** Avoid overlapping bell sequences when several orders land in quick succession. */
const SOUND_MIN_INTERVAL_MS = 2600;

const Kitchen = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, loading, isStaff, role, signOut } = useAuth();
  const { data: orders, isLoading } = useOrders(undefined, { refetchInterval: KITCHEN_POLL_MS });
  const now = useCurrentTime(1000);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const notifiedOrderIdsRef = useRef<Set<string>>(new Set());
  const previousOrderIdsRef = useRef<Set<string>>(new Set());
  const hasInitialLoadRef = useRef(false);
  const lastSoundAtRef = useRef(0);

  const ordersIdsFingerprint = useMemo(
    () => (orders ?? []).map((o) => o.id).sort().join('|'),
    [orders]
  );

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  /** Autoplay policy: first silent click / key / touch primes audio (no banner). */
  useEffect(() => {
    if (!isStaff || !user) return;
    attachSilentAudioUnlockOnFirstInteraction();
    return () => detachSilentAudioUnlockIfPending();
  }, [isStaff, user]);

  /**
   * Detect new orders by comparing IDs to the previous poll (and skip the first load).
   * Depends on `ordersIdsFingerprint` so we do not re-run when only timestamps/status change.
   * `useOrders` realtime elsewhere still refetches this query when orders change.
   */
  useEffect(() => {
    if (isLoading || orders == null) return;

    const currentIds = new Set(orders.map((o) => o.id));

    if (!hasInitialLoadRef.current) {
      previousOrderIdsRef.current = new Set(currentIds);
      hasInitialLoadRef.current = true;
      return;
    }

    const prev = previousOrderIdsRef.current;
    const newlyAppeared = orders.filter((o) => !prev.has(o.id));
    previousOrderIdsRef.current = new Set(currentIds);

    if (newlyAppeared.length === 0) return;

    const toNotify = newlyAppeared.filter((o) => !notifiedOrderIdsRef.current.has(o.id));
    if (toNotify.length === 0) return;

    for (const o of toNotify) {
      notifiedOrderIdsRef.current.add(o.id);
    }

    if (toNotify.length === 1) {
      const order = toNotify[0];
      toast.success(
        order.customer_name?.trim()
          ? t('kitchen.newOrderToastFor', { name: order.customer_name.trim() })
          : t('kitchen.newOrderToast')
      );
    } else {
      toast.success(t('kitchen.newOrdersToastBatch', { count: toNotify.length }));
    }

    const nowMs = Date.now();
    if (nowMs - lastSoundAtRef.current >= SOUND_MIN_INTERVAL_MS) {
      lastSoundAtRef.current = nowMs;
      playKitchenNewOrderSound();
    }

    for (const order of toNotify) {
      const id = order.id;
      setNewOrderIds((prevSet) => new Set(prevSet).add(id));
      window.setTimeout(() => {
        setNewOrderIds((prevSet) => {
          const next = new Set(prevSet);
          next.delete(id);
          return next;
        });
        notifiedOrderIdsRef.current.delete(id);
      }, NEW_ORDER_BADGE_MS);
    }
  }, [ordersIdsFingerprint, isLoading, orders, t, i18n.language]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const { acceptedOrders, preparingOrders, completedOrders, finishedCount } = useMemo(() => {
    const list = orders ?? [];
    const incoming = list.filter((o) => o.status === 'PENDING' || o.status === 'ACCEPTED');
    const preparing = list.filter((o) => o.status === 'PREPARING');
    const completed = list.filter((o) => o.status === 'READY' || o.status === 'CANCELED');
    const priority = (s: Order['status']) => (s === 'PENDING' ? 0 : 1);
    const sortIncoming = (a: Order, b: Order) => {
      const p = priority(a.status) - priority(b.status);
      if (p !== 0) return p;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    };
    const sortByNewest = (a: Order, b: Order) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    return {
      acceptedOrders: incoming.sort(sortIncoming),
      preparingOrders: preparing.sort(sortByNewest),
      completedOrders: completed.sort(sortByNewest),
      finishedCount: completed.length,
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
        <h1 className="text-2xl font-bold mb-2">{t('kitchen.accessDenied')}</h1>
        <p className="text-muted-foreground mb-6">{t('kitchen.noPermission')}</p>
        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            {t('kitchen.backHome')}
          </Link>
        </Button>
      </div>
    );
  }

  const columnHeader = (dotClass: string, title: string, count: number) => (
    <div className="flex items-center gap-2 mb-4">
      <div className={dotClass} />
      <h2 className="text-xl font-display font-bold">{title}</h2>
      <span className="ml-auto text-sm font-bold px-3 py-1 rounded-full bg-muted text-foreground">
        {count}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Logo />
            <span className="text-sm font-medium text-muted-foreground">{t('kitchen.display')}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher variant="header" />
            {role === 'admin' && (
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link to="/admin">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('kitchen.admin')}
                </Link>
              </Button>
            )}
            <span className="hidden sm:inline text-sm text-muted-foreground">
              {user?.email} ({role ?? '—'})
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[36px]"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('kitchen.signOut')}
            </Button>
          </div>
        </div>
      </header>

      <main className="p-3 sm:p-4 lg:p-6">
        {/* Status nav with Completed link */}
        <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2">
          <div className="flex gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
            <span className="px-2.5 py-1 rounded-full bg-muted text-foreground font-medium">
              {t('kitchen.new')}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-muted text-foreground font-medium">
              {t('kitchen.preparing')}
            </span>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 self-start sm:self-auto"
            onClick={() => navigate('/kitchen/completed')}
          >
            {t('kitchen.viewCompleted')}
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 rounded-full bg-emerald-500 text-[11px] font-bold">
              {finishedCount}
            </span>
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-8 w-32 mb-4" />
                <div className="space-y-4">
                  <Skeleton className="h-64 w-full rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              {/* NEW / ACCEPTED */}
              <div className="min-h-0 flex flex-col">
                {columnHeader('w-4 h-4 rounded-full bg-primary', t('kitchen.newOrders'), acceptedOrders.length)}
                <div className="space-y-3 sm:space-y-4 max-h-none md:max-h-[calc(100vh-180px)] overflow-visible md:overflow-y-auto md:pr-2">
                  {acceptedOrders.length === 0 ? (
                    <EmptyColumn message={t('kitchen.noNew')} />
                  ) : (
                    acceptedOrders.map((order) => (
                      <KitchenOrderCard
                        key={order.id}
                        order={order}
                        isNew={newOrderIds.has(order.id)}
                        now={now}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* PREPARING */}
              <div className="min-h-0 flex flex-col">
                {columnHeader('w-4 h-4 rounded-full bg-primary', t('kitchen.preparingCol'), preparingOrders.length)}
                <div className="space-y-3 sm:space-y-4 max-h-none md:max-h-[calc(100vh-180px)] overflow-visible md:overflow-y-auto md:pr-2">
                  {preparingOrders.length === 0 ? (
                    <EmptyColumn message={t('kitchen.noPreparing')} />
                  ) : (
                    preparingOrders.map((order) => (
                      <KitchenOrderCard
                        key={order.id}
                        order={order}
                        isNew={newOrderIds.has(order.id)}
                        now={now}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const EmptyColumn = ({ message }: { message: string }) => (
  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
    <p>{message}</p>
  </div>
);

export default Kitchen;
