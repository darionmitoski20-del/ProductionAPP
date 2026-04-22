import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Product, ProductAddon, CartItemAddon, ProductSize } from '@/types';
import { formatPrice } from '@/lib/currency';
import { useCartStore, DEFAULT_MAX_QUANTITY } from '@/store/cart';
import { useDesignSettingsContext } from '@/contexts/DesignSettingsContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Minus, Plus, ShoppingCart, X } from 'lucide-react';
import { toast } from 'sonner';
import { getProductImageUrl } from '@/lib/productImages';
import { cn } from '@/lib/utils';

interface ProductDialogProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export const ProductDialog = ({ product, open, onClose }: ProductDialogProps & { onAddedToCart?: () => void }) => {
  const { t } = useTranslation();
  const { onAddedToCart, ...props } = { onAddedToCart: undefined, product, open, onClose };
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<CartItemAddon[]>([]);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [comment, setComment] = useState('');
  const addItem = useCartStore((state) => state.addItem);
  const { settings } = useDesignSettingsContext();
  const maxQuantity = settings.max_product_quantity ?? DEFAULT_MAX_QUANTITY;

  const hasSizes = (product?.sizes?.length ?? 0) > 0;
  const isDrinksCategory = product?.category === 'drinks';

  useEffect(() => {
    if (!product) return;
    if (!hasSizes) {
      setSelectedSize(null);
      return;
    }
    const firstSize = product.sizes?.[0] ?? null;
    setSelectedSize(firstSize);
  }, [product, hasSizes]);

  useEffect(() => {
    if (product?.category === 'drinks') setComment('');
  }, [product?.id, product?.category]);

  if (!product) return null;

  const handleAddonToggle = (addon: ProductAddon) => {
    setSelectedAddons((prev) => {
      const exists = prev.find((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      }
      return [
        ...prev,
        {
          id: addon.id,
          name: addon.name,
          price: addon.price,
          name_mk: addon.name_mk,
          name_en: addon.name_en ?? addon.name,
        },
      ];
    });
  };

  const addonTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  const basePrice = selectedSize?.price ?? product.price;
  const unitPrice = basePrice + addonTotal;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    const qty = Math.min(maxQuantity, Math.max(1, quantity));
    if (hasSizes && !selectedSize) {
      toast.error(t('productDialog.selectSize'));
      return;
    }
    const note = isDrinksCategory ? '' : comment;
    addItem(product, qty, selectedAddons, note, maxQuantity, selectedSize ?? undefined);
    toast.success(t('productDialog.addedToCart', { name: product.name }));
    if (typeof onAddedToCart === 'function') {
      onAddedToCart();
    }
    handleClose();
  };

  const handleClose = () => {
    setQuantity(1);
    setSelectedAddons([]);
    setSelectedSize(null);
    setComment('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="!flex flex-col w-[calc(100vw-24px)] max-w-[420px] max-h-[85dvh] overflow-hidden p-0 gap-0 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border shadow-xl sm:max-w-md sm:max-h-[85vh]"
        aria-describedby={undefined}
        hideCloseButton
      >
        <div className="relative flex max-h-[85dvh] min-h-0 flex-col overflow-hidden bg-background sm:max-h-[85vh]">
          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-md shadow-lg ring-1 ring-white/20 hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label={t('productDialog.close')}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Image — shorter on mobile for drinks (less empty scroll area below) */}
          <div
            className={cn(
              'relative w-full shrink-0 overflow-hidden rounded-t-2xl bg-muted',
              isDrinksCategory ? 'h-[min(40vw,176px)] sm:h-[220px]' : 'h-[220px]'
            )}
          >
            <img
              src={getProductImageUrl(product)}
              alt={product.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
              aria-hidden
            />
          </div>

          {/* Scrollable content area */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className={cn('space-y-4 p-5', isDrinksCategory && 'max-sm:space-y-3 max-sm:pb-4')}>
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-xl font-bold">{product.name}</DialogTitle>

                {product.description && (
                  <p className="text-muted-foreground text-sm">{product.description}</p>
                )}

                {!hasSizes && (
                  <p className="text-2xl font-bold text-primary">{formatPrice(product.price)}</p>
                )}
              </DialogHeader>

              <div className={cn('space-y-5', isDrinksCategory && 'max-sm:space-y-4')}>
                {hasSizes && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">{t('productDialog.size')}</Label>
                    <div className="space-y-2">
                      {product.sizes?.map((size) => {
                        const checked = selectedSize?.id === size.id;
                        return (
                          <button
                            key={size.id}
                            type="button"
                            onClick={() => setSelectedSize(size)}
                            className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                              checked ? 'border-primary bg-primary/5' : 'hover:bg-secondary/50'
                            }`}
                          >
                            <span className="font-medium">{size.name}</span>
                            <span className="font-semibold text-primary">{formatPrice(size.price)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">{t('productDialog.quantity')}</Label>
                    {quantity >= maxQuantity && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t('productDialog.maxPerItem', { max: maxQuantity })}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <span className="w-8 text-center text-lg font-bold">{quantity}</span>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newQty = Math.min(maxQuantity, quantity + 1);
                        setQuantity(newQty);
                        if (newQty >= maxQuantity) {
                          toast.info(t('productDialog.maxPerItemToast', { max: maxQuantity }));
                        }
                      }}
                      disabled={quantity >= maxQuantity}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Add-ons */}
                {product.addons && product.addons.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">{t('productDialog.addons')}</Label>

                    <div className="space-y-2">
                      {product.addons.map((addon) => (
                        <label
                          key={addon.id}
                          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-secondary/50 cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedAddons.some((a) => a.id === addon.id)}
                              onCheckedChange={() => handleAddonToggle(addon)}
                            />
                            <span className="font-medium">{addon.name}</span>
                          </div>

                          <span className="font-semibold text-primary">
                            +{formatPrice(addon.price)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {!isDrinksCategory ? (
                  <div className="space-y-2 pb-2">
                    <Label htmlFor="comment" className="text-base font-medium">
                      {t('productDialog.specialInstructions')}
                    </Label>

                    <Textarea
                      id="comment"
                      placeholder={t('productDialog.commentPlaceholder')}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="resize-none"
                      rows={2}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Fixed bottom CTA */}
          <div className="shrink-0 border-t bg-background p-4">
            <Button
              size="lg"
              className="h-14 w-full text-lg"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {t('productDialog.addToCart', { price: formatPrice(totalPrice) })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};