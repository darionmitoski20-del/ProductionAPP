import { Product } from '@/types';
import { formatPrice } from '@/lib/currency';
import { getProductImageUrl } from '@/lib/productImages';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export const ProductCard = ({ product, onClick }: ProductCardProps) => {
  const imageUrl = getProductImageUrl(product);
  const isDrinks = product.category === 'drinks';
  return (
    <Card
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] sm:rounded-xl"
      onClick={onClick}
    >
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-t-lg bg-muted sm:rounded-t-xl',
          isDrinks
            ? 'aspect-square sm:aspect-[5/6]'
            : 'aspect-[3/2] sm:aspect-[4/3]'
        )}
      >
        <img
          src={imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-t-lg bg-gradient-to-t from-black/40 via-transparent to-transparent sm:rounded-t-xl"
          aria-hidden
        />
      </div>
      <CardContent
        className={cn(
          'flex min-h-0 flex-1 flex-col p-2 pt-1.5 sm:p-3 sm:pt-2',
          isDrinks && 'max-sm:p-1.5 max-sm:pt-1'
        )}
      >
        <div className="min-h-0 flex-1">
          <h3
            className={cn(
              'line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:text-base',
              isDrinks && 'max-sm:text-[13px] max-sm:leading-tight'
            )}
          >
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground sm:mt-1 sm:line-clamp-2">
              {product.description}
            </p>
          )}
        </div>
        <div className="mt-auto flex shrink-0 items-center justify-between pt-1.5 sm:pt-2">
          <span className="text-sm font-bold tabular-nums text-primary sm:text-base">
            {formatPrice(product.price)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
