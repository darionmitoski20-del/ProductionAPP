import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useCartStore } from '@/store/cart';
import { formatPrice } from '@/lib/currency';
import { getProductImageUrl } from '@/lib/productImages';
import { X, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const CartDrawer = ({ open, onClose }: CartDrawerProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getTotal = useCartStore((state) => state.getTotal);

  const total = getTotal();

  const handlePlaceOrder = () => {
    if (items.length === 0) return;
    onClose();
    navigate('/cart');
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton
        aria-describedby={undefined}
        className="fixed inset-y-0 right-0 left-auto top-0 z-50 grid w-full max-w-full sm:max-w-[400px] translate-x-0 translate-y-0 gap-0 border-0 bg-background p-0 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right sm:rounded-l-2xl"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="text-base font-semibold">{t('cartDrawer.yourOrder')}</h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label={t('cartDrawer.closeCart')}
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <p>{t('cartDrawer.empty')}</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-xl border border-border/70 bg-card/80 p-2.5 shadow-sm"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={getProductImageUrl(item.product)}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{item.product.name}</p>
                        {item.selectedSize && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {t('cartDrawer.size', { name: item.selectedSize.name })}
                          </p>
                        )}
                        {item.addons && item.addons.length > 0 && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            + {item.addons.map((a) => a.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                        aria-label={t('cartDrawer.removeItem')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2 py-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted"
                          aria-label={t('cartDrawer.decreaseQty')}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted"
                          aria-label={t('cartDrawer.increaseQty')}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}

          </div>

          {/* Footer */}
          <footer className="border-t px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('cartDrawer.total')}</span>
              <span className="text-lg font-bold tabular-nums">{formatPrice(total)}</span>
            </div>
            <Button
              type="button"
              className="mt-1 h-11 w-full rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
              disabled={items.length === 0}
              onClick={handlePlaceOrder}
            >
              {t('cartDrawer.placeOrder')}
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
};
