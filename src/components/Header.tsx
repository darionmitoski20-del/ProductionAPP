import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export const Header = () => {
  const { t } = useTranslation();
  const itemCount = useCartStore((state) => state.getItemCount());

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex items-center shrink-0 min-w-0">
          <Logo />
        </Link>

        <div className="flex items-center justify-end gap-2 sm:gap-3 min-w-0">
          <LanguageSwitcher variant="header" />
          <Button asChild variant="outline" size="sm" className="gap-2 rounded-full font-medium shrink-0 h-9 px-3 sm:px-4">
            <Link to="/cart" aria-label={t('header.cartAria', { count: itemCount })}>
              <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="text-sm whitespace-nowrap">{t('header.cartWithCount', { count: itemCount })}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
