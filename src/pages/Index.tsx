import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveCategoryName } from '@/lib/localizedContent';
import { Header } from '@/components/Header';
import { CategoryTabs } from '@/components/CategoryTabs';
import { ProductCard } from '@/components/ProductCard';
import { ProductDialog } from '@/components/ProductDialog';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useRestaurantOpenState } from '@/hooks/useRestaurantOpenState';
import type { Product } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ActiveOrderBanner } from '@/components/ActiveOrderBanner';
import { useDesignSettingsContext } from '@/contexts/DesignSettingsContext';
import { CartDrawer } from '@/components/CartDrawer';
import { MenuFooter } from '@/components/MenuFooter';
import { translateOpenStateStatus } from '@/lib/translateOpenState';

function productsAreAllDrinks(products: Product[] | undefined): boolean {
  return !!products?.length && products.every((p) => p.category === 'drinks');
}

const Index = () => {
  const { t, i18n } = useTranslation();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { openState, isLoading: openStateLoading } = useRestaurantOpenState();
  const { data: products, isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const { settings: designSettings } = useDesignSettingsContext();

  const heroStyle = useMemo(() => {
    const t = designSettings.hero_background_type;
    if (t === 'solid') {
      return { background: designSettings.hero_solid_color };
    }
    if (t === 'image' && designSettings.hero_image_url) {
      return {
        backgroundImage: `url(${designSettings.hero_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return {
      background: `linear-gradient(135deg, ${designSettings.hero_gradient_from} 0%, ${designSettings.hero_gradient_to} 100%)`,
    };
  }, [designSettings.hero_background_type, designSettings.hero_gradient_from, designSettings.hero_gradient_to, designSettings.hero_solid_color, designSettings.hero_image_url]);

  const activeCategories = useMemo(
    () =>
      categories
        .filter((c) => c.is_active)
        .map((c) => ({
          id: c.id,
          name: resolveCategoryName(i18n.language, c),
        })),
    [categories, i18n.language]
  );

  /** Match admin menu: link by category_id, or legacy row where only enum slug matches menu_categories.slug */
  const filteredProducts = useMemo(() => {
    if (!products) return undefined;
    if (!activeCategoryId) return products;
    const selected = categories.find((c) => c.id === activeCategoryId);
    return products.filter((p) => {
      if (p.category_id === activeCategoryId) return true;
      if (p.category_id) return false;
      return !!(selected && p.category === selected.slug);
    });
  }, [products, activeCategoryId, categories]);

  const groupedByCategoryId = useMemo(() => {
    const map: Record<string, Product[]> = {};
    (filteredProducts ?? []).forEach((p) => {
      const key =
        p.category_id ?? categories.find((c) => c.slug === p.category)?.id ?? '';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [filteredProducts, categories]);

  const visibleProductCount = useMemo(() => {
    if (!filteredProducts?.length) return 0;
    if (activeCategoryId) return filteredProducts.length;
    let n = 0;
    for (const cat of activeCategories) {
      n += groupedByCategoryId[cat.id]?.length ?? 0;
    }
    n += groupedByCategoryId['']?.length ?? 0;
    return n;
  }, [filteredProducts, activeCategoryId, activeCategories, groupedByCategoryId]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <div className="container pt-3">
        <ActiveOrderBanner />
        {!openStateLoading && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs sm:text-sm font-medium ${
                openState.isOpen
                  ? 'bg-green-50 text-green-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              <span
                className={`inline-flex h-2 w-2 rounded-full ${
                  openState.isOpen ? 'bg-green-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{openState.isOpen ? t('index.openNow') : t('index.closedNow')}</span>
            </div>
            {!openState.isOpen && (
              <span className="text-xs text-muted-foreground truncate max-w-[60%] text-right">
                {translateOpenStateStatus(openState.statusI18n, t)}
              </span>
            )}
          </div>
        )}

      </div>

      <section
        className="relative px-4 py-12 text-white sm:py-14 md:py-16 overflow-hidden"
        style={heroStyle}
      >
        {designSettings.hero_background_type === 'image' && designSettings.hero_image_url && (
          <div className="absolute inset-0 bg-black/55" aria-hidden />
        )}
        {designSettings.hero_background_type !== 'image' && (
          <div className="absolute inset-0 bg-black/10" aria-hidden />
        )}
        <div className="container relative flex flex-col items-center">
          <h1
            className="text-center font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl lg:text-[3.5rem]"
            style={{ letterSpacing: '0.12em' }}
          >
            {designSettings.hero_title || 'РЕСТОРАН МЕНИ'}
          </h1>
          <div className="mt-3 flex items-center gap-3 sm:mt-4 sm:gap-4">
            <span className="block h-px w-8 bg-white/40 sm:w-12" />
            <span className="text-white/70 text-lg sm:text-xl">&#10022;</span>
            <span className="block h-px w-8 bg-white/40 sm:w-12" />
          </div>
          <p
            className="mt-2 text-center text-sm text-white/80 sm:text-base md:mt-3 md:text-lg"
            style={{ letterSpacing: '0.04em', fontWeight: 300 }}
          >
            {designSettings.hero_subtitle || 'Порачај го твоето јадење од нашето мени'}
          </p>
        </div>
      </section>

      <section className="sticky top-16 z-40 border-b bg-background py-2 sm:py-2.5">
        <div className="container">
          <CategoryTabs
            categoriesFromDb={activeCategories}
            activeCategoryId={activeCategoryId}
            onSelect={setActiveCategoryId}
          />
        </div>
      </section>

      <main className="container flex-1 py-4 pb-20 sm:pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-1.5 sm:space-y-2">
                <Skeleton className="aspect-[3/2] w-full rounded-t-lg sm:aspect-[4/3] sm:rounded-t-xl" />
                <Skeleton className="h-3.5 w-3/4 sm:h-4" />
                <Skeleton className="h-3.5 w-1/2 sm:h-4" />
              </div>
            ))}
          </div>
        ) : activeCategoryId ? (
          <div
            className={
              productsAreAllDrinks(filteredProducts)
                ? 'grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-4 lg:grid-cols-5'
                : 'grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4'
            }
          >
            {filteredProducts?.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {activeCategories.map((cat) => {
              const categoryProducts = groupedByCategoryId[cat.id];
              if (!categoryProducts?.length) return null;
              return (
                <div key={cat.id}>
                  <h2 className="mb-2 font-display text-lg font-bold text-foreground sm:mb-3 sm:text-xl">
                    {cat.name}
                  </h2>
                  <div
                    className={
                      productsAreAllDrinks(categoryProducts)
                        ? 'grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-4 lg:grid-cols-5'
                        : 'grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4'
                    }
                  >
                    {categoryProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onClick={() => setSelectedProduct(product)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {groupedByCategoryId['']?.length ? (
              <div key="__uncategorized__">
                <h2 className="mb-2 font-display text-lg font-bold text-foreground sm:mb-3 sm:text-xl">
                  {t('index.uncategorized')}
                </h2>
                <div
                  className={
                    productsAreAllDrinks(groupedByCategoryId[''])
                      ? 'grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-4 lg:grid-cols-5'
                      : 'grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4'
                  }
                >
                  {groupedByCategoryId[''].map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => setSelectedProduct(product)}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {visibleProductCount === 0 && !isLoading && (
          <div className="py-8 text-center text-muted-foreground sm:py-10">
            <p className="text-sm sm:text-base">{t('index.noProducts')}</p>
          </div>
        )}
      </main>

      <MenuFooter />

      <ProductDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddedToCart={() => setIsCartOpen(true)}
      />
      {/* Cart drawer is rendered at root so it can overlay the page */}
      <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};
export default Index;
