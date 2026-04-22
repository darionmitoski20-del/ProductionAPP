import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { CartItemCard } from '@/components/CartItemCard';
import { useCartStore } from '@/store/cart';
import { useCreateOrder } from '@/hooks/useOrders';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ShoppingBag, Clock, History, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { addMinutes, format, roundToNearestMinutes, setMinutes, setHours } from 'date-fns';
import { setActiveOrderSession } from '@/lib/activeOrderSession';
import { addOrderToHistorySession } from '@/lib/orderHistorySession';
import { ActiveOrderBanner } from '@/components/ActiveOrderBanner';
import { useRestaurantOpenState } from '@/hooks/useRestaurantOpenState';
import { translateOpenStateStatus } from '@/lib/translateOpenState';
import { isOrderClosedError } from '@/lib/orderErrors';
import { normalizeMacedonianMobile, isValidMacedonianMobile } from '@/lib/mkPhone';
import { cn } from '@/lib/utils';

const Cart = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openState } = useRestaurantOpenState();
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const clearCart = useCartStore((state) => state.clearCart);
  const createOrder = useCreateOrder();
  const isOrderingBlocked = !openState.isOpen;

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pickupTimeOption, setPickupTimeOption] = useState('asap');
  const [selectedTime, setSelectedTime] = useState('');
  const [orderNote, setOrderNote] = useState('');

  const total = getTotal();

  // Generate pickup time slots (15-minute intervals)
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const now = new Date();
    const start = roundToNearestMinutes(addMinutes(now, 30), { nearestTo: 15 });
    
    for (let i = 0; i < 12; i++) {
      const time = addMinutes(start, i * 15);
      slots.push(format(time, 'HH:mm'));
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !phone.trim()) {
      toast.error(t('cart.fillNamePhone'));
      return;
    }

    const phoneDigits = normalizeMacedonianMobile(phone);
    if (!isValidMacedonianMobile(phoneDigits)) {
      setPhoneError(t('cart.phoneInvalid'));
      return;
    }
    setPhoneError(null);

    if (items.length === 0) {
      toast.error(t('cart.empty'));
      return;
    }

    if (isOrderingBlocked) {
      toast.error(translateOpenStateStatus(openState.statusI18n, t) || t('cart.orderingClosed'));
      return;
    }

    let pickupTime: Date | null = null;
    if (pickupTimeOption === 'scheduled' && selectedTime) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      pickupTime = setMinutes(setHours(new Date(), hours), minutes);
    }

    try {
      const order = await createOrder.mutateAsync({
        customerName: customerName.trim(),
        phone: phoneDigits,
        pickupTimeOption,
        pickupTime,
        orderNote: orderNote.trim(),
        items,
        total,
      });

      setActiveOrderSession(order.id, order.created_at ?? new Date().toISOString());
      addOrderToHistorySession(order.id, order.created_at ?? new Date().toISOString());
      clearCart();
      toast.success(t('cart.placedSuccess'));
      navigate(`/order/${order.id}`);
    } catch (error) {
      console.error('[Cart] Failed to place order.', error);
      if (isOrderClosedError(error)) {
        toast.error(translateOpenStateStatus(error.statusI18n, t));
        return;
      }
      const message =
        error instanceof Error ? error.message : t('cart.placeOrderFailed');
      toast.error(message);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
        <Header />
        <div className="container max-w-full pt-4">
          <ActiveOrderBanner />
          {isOrderingBlocked && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <Clock className="h-4 w-4 shrink-0" />
              <span>{translateOpenStateStatus(openState.statusI18n, t)}</span>
            </div>
          )}
        </div>

        <div className="container max-w-full py-4 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-5 sm:mb-6">
            <Link
              to="/"
              className="inline-flex items-center text-sm sm:text-base text-muted-foreground hover:text-foreground w-fit"
            >
              <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
              {t('cart.backToMenu')}
            </Link>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-2 rounded-full font-medium h-9 px-4 w-full sm:w-auto justify-center"
            >
              <Link to="/orders">
                <History className="h-4 w-4 shrink-0" />
                <span className="text-sm">{t('cart.orderHistory')}</span>
              </Link>
            </Button>
          </div>

          <Card className="max-w-lg mx-auto border shadow-sm">
            <CardContent className="py-12 px-6 text-center">
              <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h1 className="text-2xl font-bold mb-2">{t('cart.emptyTitle')}</h1>
              <p className="text-muted-foreground mb-6">{t('cart.emptyHint')}</p>
              <Button asChild size="lg">
                <Link to="/">
                  <ArrowLeft className="mr-2 h-5 w-5" />
                  {t('cart.browseMenu')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 overflow-x-hidden">
      <Header />
      <div className="container max-w-full pt-4">
        <ActiveOrderBanner />
        {isOrderingBlocked && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{translateOpenStateStatus(openState.statusI18n, t)}</span>
          </div>
        )}
      </div>

      <div className="container max-w-full py-4 sm:py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-5 sm:mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-sm sm:text-base text-muted-foreground hover:text-foreground w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
            {t('cart.backToMenu')}
          </Link>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-2 rounded-full font-medium h-9 px-4 w-full sm:w-auto justify-center"
          >
            <Link to="/orders">
              <History className="h-4 w-4 shrink-0" />
              <span className="text-sm">{t('cart.orderHistory')}</span>
            </Link>
          </Button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-bold mb-5 sm:mb-6 tracking-tight">
          {t('cart.yourOrder')}
        </h1>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 min-w-0">
          {/* Cart Items */}
          <div className="space-y-3 sm:space-y-4 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold">{t('cart.itemsCount', { count: items.length })}</h2>
            {items.map((item) => (
              <CartItemCard key={item.id} item={item} />
            ))}

            {/* Order Summary */}
            <Card className="mt-4 sm:mt-6">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-base sm:text-lg">
                  <span className="font-medium">{t('cart.total')}</span>
                  <span className="text-xl sm:text-2xl font-bold text-primary tabular-nums">
                    {formatPrice(total)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Checkout Form */}
          <form
            onSubmit={handleSubmit}
            className="flex min-w-0 flex-col gap-4 sm:gap-6 lg:items-stretch"
          >
            {/* Invisible mirror of "Items" heading so Pickup card aligns with first item on lg+ */}
            <div className="space-y-3 sm:space-y-4">
              <h2
                className="hidden text-base font-semibold select-none pointer-events-none lg:block sm:text-lg invisible"
                aria-hidden
              >
                {t('cart.itemsCount', { count: items.length })}
              </h2>
              {/* Pickup Time */}
              <Card className="overflow-hidden">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold leading-snug sm:text-xl">
                  <Clock className="h-5 w-5 shrink-0 text-primary" />
                  {t('cart.pickupTime')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0 sm:space-y-4">
                <p className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs sm:text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden />
                  <span>{t('cart.cardPaymentHint')}</span>
                </p>
                <RadioGroup
                  value={pickupTimeOption}
                  onValueChange={setPickupTimeOption}
                  className="gap-0"
                >
                  <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-lg border hover:bg-secondary/50 cursor-pointer">
                    <RadioGroupItem value="asap" id="asap" className="mt-0.5 shrink-0" />
                    <Label htmlFor="asap" className="flex-1 min-w-0 cursor-pointer font-normal">
                      <span className="font-medium text-sm sm:text-base">{t('cart.asap')}</span>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{t('cart.asapHint')}</p>
                    </Label>
                  </div>
                  <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-lg border hover:bg-secondary/50 cursor-pointer mt-3">
                    <RadioGroupItem value="scheduled" id="scheduled" className="mt-0.5 shrink-0" />
                    <Label htmlFor="scheduled" className="flex-1 min-w-0 cursor-pointer font-normal">
                      <span className="font-medium text-sm sm:text-base">{t('cart.scheduled')}</span>
                    </Label>
                  </div>
                </RadioGroup>

                {pickupTimeOption === 'scheduled' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                    {timeSlots.map((time) => (
                      <Button
                        key={time}
                        type="button"
                        variant={selectedTime === time ? 'default' : 'outline'}
                        size="sm"
                        className="min-h-10 px-2 text-xs sm:text-sm tabular-nums"
                        onClick={() => setSelectedTime(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            {/* Contact Info */}
            <Card className="overflow-hidden">
              <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
                <CardTitle className="text-lg font-semibold leading-snug sm:text-xl">{t('cart.yourDetails')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('cart.nameLabel')}</Label>
                  <Input
                    id="name"
                    placeholder={t('cart.namePlaceholder')}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('cart.phoneLabel')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder={t('cart.phonePlaceholder')}
                    maxLength={15}
                    value={phone}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 15);
                      setPhone(digitsOnly);
                      if (
                        phoneError &&
                        (digitsOnly.length === 0 || isValidMacedonianMobile(digitsOnly))
                      ) {
                        setPhoneError(null);
                      }
                    }}
                    onBlur={() => {
                      const n = normalizeMacedonianMobile(phone);
                      if (n !== phone) setPhone(n);
                      if (n.length === 0) {
                        setPhoneError(null);
                        return;
                      }
                      if (!isValidMacedonianMobile(n)) {
                        setPhoneError(t('cart.phoneInvalid'));
                      } else {
                        setPhoneError(null);
                      }
                    }}
                    aria-invalid={phoneError ? true : undefined}
                    className={cn(
                      phoneError &&
                        'border-destructive focus-visible:ring-destructive'
                    )}
                    required
                  />
                  {phoneError ? (
                    <p className="text-sm text-destructive" role="alert">
                      {phoneError}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">{t('cart.noteLabel')}</Label>
                  <Textarea
                    id="note"
                    placeholder={t('cart.notePlaceholder')}
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full min-h-12 h-auto py-3.5 px-4 text-base sm:text-lg font-bold whitespace-normal leading-snug"
              disabled={createOrder.isPending || isOrderingBlocked}
            >
              {createOrder.isPending
                ? t('cart.placing')
                : isOrderingBlocked
                  ? t('cart.orderingClosedWithStatus', {
                      status: translateOpenStateStatus(openState.statusI18n, t),
                    })
                  : t('cart.confirmWithTotal', { total: formatPrice(total) })}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Cart;
