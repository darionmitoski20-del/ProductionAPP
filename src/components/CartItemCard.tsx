import { useTranslation } from 'react-i18next';
import { displayStoredProductName, displayStoredAddonOrSizeName } from '@/lib/localizedContent';
import { CartItem } from '@/types';
import { formatPrice } from '@/lib/currency';
import { useCartStore, DEFAULT_MAX_QUANTITY } from '@/store/cart';
import { useDesignSettingsContext } from '@/contexts/DesignSettingsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getProductImageUrl } from '@/lib/productImages';

interface CartItemCardProps {
  item: CartItem;
}

export const CartItemCard = ({ item }: CartItemCardProps) => {
  const { t, i18n } = useTranslation();
  const productLabel = displayStoredProductName(i18n.language, item.product);
  const sizeLabel = item.selectedSize
    ? displayStoredAddonOrSizeName(i18n.language, item.selectedSize)
    : null;
  const addonLabels =
    item.addons?.map((a) => displayStoredAddonOrSizeName(i18n.language, a)) ?? [];
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const { settings } = useDesignSettingsContext();
  const maxQuantity = settings.max_product_quantity ?? DEFAULT_MAX_QUANTITY;

  return (
    <Card className="animate-slide-in min-w-0">
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-3 sm:gap-4 min-w-0">
          {/* Product Image */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted aspect-square">
            <img
              src={getProductImageUrl(item.product)}
              alt={productLabel}
              className="h-full w-full object-cover"
            />
            <div
              className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-t from-black/30 to-transparent"
              aria-hidden
            />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-foreground line-clamp-1">
                {productLabel}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                onClick={() => removeItem(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {item.selectedSize && sizeLabel && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('cartItem.size', { name: sizeLabel })}
              </p>
            )}

            {/* Add-ons / extras */}
            {item.addons && item.addons.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('cartItem.addons', { list: addonLabels.join(', ') })}
              </p>
            )}

            {/* Comment */}
            {item.comment && (
              <p className="text-xs text-muted-foreground italic mt-1 line-clamp-1">
                "{item.comment}"
              </p>
            )}

            {/* Price and Quantity */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center font-medium">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    const newQty = Math.min(maxQuantity, item.quantity + 1);
                    updateQuantity(item.id, newQty, maxQuantity);
                    if (newQty >= maxQuantity) {
                      toast.info(t('cartItem.maxPerItem', { max: maxQuantity }));
                    }
                  }}
                  disabled={item.quantity >= maxQuantity}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <span className="font-bold text-primary tabular-nums text-sm sm:text-base shrink-0">
                {formatPrice(item.subtotal)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
