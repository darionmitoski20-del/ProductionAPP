import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { useOrder } from '@/hooks/useOrders';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, CheckCircle2, PackageCheck, MapPin, Clock, Phone, XCircle } from 'lucide-react';
import { useActiveOrderSession } from '@/hooks/useActiveOrderSession';
import { isAuthOrMissingOrderError, isCustomerActiveOrderStatus } from '@/lib/activeOrderSession';
import { formatPrice } from '@/lib/currency';
import { format, differenceInMinutes } from 'date-fns';
import {
  customerPrepElapsedMs,
  formatKitchenPrepElapsedMs,
} from '@/lib/kitchenOrderTimer';
import { useDesignSettingsContext } from '@/contexts/DesignSettingsContext';
import { addOrderToHistorySession } from '@/lib/orderHistorySession';
import { formatOrderUiTitle } from '@/lib/orderUiTitle';
import { computeOrderProgress } from '@/lib/orderProgress';

/** Page background: very light neutral for clean contrast */
const PAGE_BG = '#F9FAFB';

const OrderTracking = () => {
  const { t } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const { data: order, isLoading, isError, error } = useOrder(orderId || null);
  const { orderId: activeOrderId, setActiveOrder, clearActiveOrder } = useActiveOrderSession();
  const { settings } = useDesignSettingsContext();
  const lastHistoryOrderIdRef = useRef<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!order || !orderId) return;
    if (lastHistoryOrderIdRef.current !== order.id) {
      addOrderToHistorySession(order.id, order.created_at);
      lastHistoryOrderIdRef.current = order.id;
    }
    if (isCustomerActiveOrderStatus(order.status)) {
      setActiveOrder(order.id, order.created_at);
    } else {
      clearActiveOrder();
    }
  }, [order, orderId, setActiveOrder, clearActiveOrder]);

  useEffect(() => {
    if (!isError) return;
    if (isAuthOrMissingOrderError(error) && orderId && activeOrderId === orderId) {
      clearActiveOrder();
    }
  }, [isError, error, orderId, activeOrderId, clearActiveOrder]);

  useEffect(() => {
    if (!order || order.status !== 'PREPARING') return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [order?.id, order?.status]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen pb-24"
        style={{ backgroundColor: PAGE_BG }}
      >
        <Header />
        <div className="container py-6 lg:py-8 max-w-[1100px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-80 w-full rounded-[20px]" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div
        className="min-h-screen pb-24"
        style={{ backgroundColor: PAGE_BG }}
      >
        <Header />
        <div className="container py-12 text-center max-w-[1100px] mx-auto px-4 sm:px-6">
          <h1 className="text-2xl font-bold mb-2">{t('orderTracking.notFoundTitle')}</h1>
          <p className="text-muted-foreground mb-6">{t('orderTracking.notFoundBody')}</p>
          <Button asChild className="min-h-[44px]">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('orderTracking.backToMenu')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isCanceled = order.status === 'CANCELED';
  const isReady = order.status === 'READY';
  const isPending = order.status === 'PENDING';
  const isPreparing = order.status === 'PREPARING';
  const placedMinutesAgo = Math.max(
    1,
    differenceInMinutes(new Date(), new Date(order.created_at))
  );
  const progressNow =
    order.status === 'PREPARING' ? new Date(nowMs) : new Date();
  const { progressPercent, etaAt } = computeOrderProgress(order, progressNow);
  const prepElapsedMs = customerPrepElapsedMs(order, nowMs);
  const prepElapsedLabel =
    prepElapsedMs != null ? formatKitchenPrepElapsedMs(prepElapsedMs) : null;
  const approvedStepComplete =
    !isPending && (order.status === 'ACCEPTED' || isPreparing || isReady);
  const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const orderHeadingLabel = formatOrderUiTitle(order.customer_name, t);
  const metaLabel = t('orderTracking.metaLine', {
    minutes: placedMinutesAgo,
    count: itemCount,
    total: formatPrice(order.total),
  });

  const pickupTimingText =
    settings.pickup_timing_text?.trim() || t('orderTracking.defaultPickupTiming');
  const locationName = settings.pickup_location_name?.trim() || t('orderTracking.defaultLocationName');
  const locationAddress = settings.pickup_location_address?.trim() || t('orderTracking.defaultAddress');
  const pickupPhone = settings.pickup_phone?.trim() || t('orderTracking.defaultPhone');
  const acceptedUntil = pickupTimingText.toLowerCase().includes('until')
    ? pickupTimingText.split(/until/i)[1]?.trim()
    : null;

  return (
    <>
      <style>
        {`
          @keyframes orderPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.85;
            }
          }
        `}
      </style>
      <div
        className="min-h-screen pb-24"
        style={{ backgroundColor: PAGE_BG }}
      >
      <Header />

      <div className="container py-4 sm:py-6 lg:py-8 max-w-[760px] mx-auto px-3 sm:px-6">
        <div className="mb-4 sm:mb-5">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg min-h-[44px] px-3 py-2 -ml-1"
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" aria-hidden />
            <span>{t('orderTracking.backToMenu')}</span>
          </Link>
        </div>

        <article className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden">
          <div className="p-5 sm:p-6 space-y-6">
            {/* Header row */}
            <section className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                    {orderHeadingLabel}
                  </h1>
                  <span
                    className={
                      isReady
                        ? 'inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-semibold'
                        : 'inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold'
                    }
                  >
                    {isReady
                      ? t('orderTracking.readyForPickup')
                      : isPending
                        ? t('orderTracking.pendingBadge')
                        : isPreparing
                          ? t('orderTracking.preparingBadge')
                          : t('orderTracking.approved')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{metaLabel}</p>
              </div>
              {isReady || isPreparing ? (
                <div
                  className={
                    isReady
                      ? 'shrink-0 inline-flex items-center gap-1.5 text-emerald-600 font-semibold text-sm'
                      : 'shrink-0 inline-flex items-center gap-1.5 text-primary font-semibold text-sm'
                  }
                >
                  <PackageCheck className="h-4 w-4" />
                  <span>{isReady ? t('orderTracking.readyNow') : t('orderTracking.preparingNow')}</span>
                </div>
              ) : null}
            </section>

            {isCanceled && (
              <section className="rounded-xl border border-red-200 bg-red-50 p-5">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <XCircle className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-red-800">{t('orderTracking.canceledTitle')}</p>
                    <p className="text-sm text-red-700/90 mt-1">
                      {t('orderTracking.canceledBody')}
                    </p>
                    <p className="text-xs text-red-600/80 mt-2">
                      {t('orderTracking.canceledContact')}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {!isCanceled && (
              <>
                {/* Status stepper */}
                <section className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    <div>
                      <p className="text-base font-semibold text-foreground tracking-tight">
                        {isReady
                          ? t('orderTracking.orderReadyTitle')
                          : isPreparing
                            ? t('orderTracking.orderPreparingTitle')
                            : isPending
                              ? t('orderTracking.orderPendingTitle')
                              : t('orderTracking.orderAcceptedTitle')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {etaAt
                          ? t('orderTracking.etaAround', { time: format(etaAt, 'HH:mm') })
                          : order.pickup_time
                            ? t('orderTracking.etaAround', { time: format(new Date(order.pickup_time), 'HH:mm') })
                            : t('orderTracking.etaSoon')}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {order.pickup_time && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 tabular-nums shadow-sm">
                          {t('orderTracking.readyBy', { time: format(new Date(order.pickup_time), 'HH:mm') })}
                        </span>
                      )}
                      {(isPreparing || isReady) && prepElapsedLabel ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/25 tabular-nums shadow-sm">
                          <Clock className="h-3.5 w-3.5" />
                          {prepElapsedLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="relative px-2">
                    <div className="relative flex items-start justify-between">
                      <span className="absolute left-12 right-12 top-[18px] h-[2px] bg-gray-200 overflow-hidden rounded-full">
                        <span
                          className="block h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </span>

                      <div className="relative z-10 flex w-24 -translate-x-5 flex-col items-center gap-2">
                        <span
                          className={
                            approvedStepComplete
                              ? 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-50 transition-all duration-300'
                              : 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted-foreground border border-gray-200 shadow-sm transition-all duration-300'
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                        <span className="w-full text-xs font-medium text-foreground text-center leading-tight">
                          {t('orderTracking.stepApproved')}
                        </span>
                      </div>

                      <div className="relative z-10 flex w-24 translate-x-5 flex-col items-center gap-2">
                        <span
                          className={
                            isReady
                              ? 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-4 ring-emerald-50 transition-all duration-300'
                              : 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted-foreground border border-gray-200 shadow-sm'
                          }
                          style={isReady ? { animation: 'orderPulse 1.8s ease-in-out infinite' } : undefined}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                        <span className="w-full text-xs font-medium text-foreground text-center leading-tight">
                          {t('orderTracking.stepReady')}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                {isReady ? (
                  <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">{t('orderTracking.pickupReadyTitle')}</p>
                        <p className="text-sm text-emerald-700/90 mt-0.5">
                          {t('orderTracking.pickupReadyBody')}
                        </p>
                      </div>
                    </div>
                  </section>
                ) : null}
              </>
            )}

            {/* Your order */}
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-white">
                <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                  {t('orderTracking.yourOrderSection')}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t('orderTracking.yourOrderHint')}</p>
              </div>
              <div className="p-5">
                <ul className="space-y-0">
                  {order.items?.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3 py-3 border-b border-gray-100 last:border-b-0">
                      <div className="min-w-0 pr-2">
                        <span className="text-sm font-medium text-foreground">
                          <span className="inline-flex items-center justify-center min-w-[1.4rem] h-[1.4rem] rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold mr-2">
                            {item.quantity}
                          </span>
                          {item.product_name}
                        </span>
                        {item.comment && (
                          <p className="text-xs text-muted-foreground italic mt-0.5 ml-7">
                            {t('orderTracking.notePrefix', { note: item.comment })}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap shrink-0">
                        {formatPrice(item.subtotal)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">{t('cart.total')}</span>
                  <span className="text-2xl font-bold text-foreground tabular-nums">{formatPrice(order.total)}</span>
                </div>
              </div>
            </section>

            {/* Pickup location */}
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-white">
                <h2 className="text-base font-semibold text-foreground">{t('orderTracking.pickupLocation')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{t('orderTracking.pickupLocationHint')}</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3 rounded-xl bg-white border border-gray-200 px-3 py-3 hover:bg-gray-50 transition-colors">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary border border-gray-200">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{locationName}</p>
                    <p className="text-xs text-muted-foreground truncate">{locationAddress}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{pickupTimingText}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-white border border-gray-200 px-3 py-3 hover:bg-gray-50 transition-colors">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary border border-gray-200">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{pickupTimingText}</p>
                    <p className="text-xs text-muted-foreground">
                      {acceptedUntil
                        ? t('orderTracking.ordersAcceptedUntil', { time: acceptedUntil })
                        : t('orderTracking.ordersAcceptedHours')}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-white border border-gray-200 px-3 py-3 hover:bg-gray-50 transition-colors">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-primary border border-gray-200">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('orderTracking.phone')}</p>
                    <a
                      href={`tel:${pickupPhone.replace(/\s+/g, '')}`}
                      className="text-sm font-medium text-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded break-all"
                    >
                      {pickupPhone}
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </article>
      </div>
    </div>
    </>
  );
};

export default OrderTracking;
