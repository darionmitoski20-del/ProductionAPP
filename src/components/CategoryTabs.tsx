import { ProductCategory } from '@/types';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

/** Category item from DB (customer menu uses this). */
export interface CategoryTabItem {
  id: string;
  name: string;
}

interface CategoryTabsPropsBase {
  /** In DB mode: category uuid. In legacy mode: ProductCategory slug. */
  activeCategoryId: string | null;
  onSelect: (categoryIdOrSlug: string | null) => void;
}

interface CategoryTabsPropsLegacy extends CategoryTabsPropsBase {
  categories: ProductCategory[];
  categoriesFromDb?: never;
}

interface CategoryTabsPropsDb extends CategoryTabsPropsBase {
  categories?: never;
  categoriesFromDb: CategoryTabItem[];
}

export type CategoryTabsProps = CategoryTabsPropsLegacy | CategoryTabsPropsDb;

export const CategoryTabs = (props: CategoryTabsProps) => {
  const { t } = useTranslation();
  const { activeCategoryId, onSelect } = props;
  const fromDb = 'categoriesFromDb' in props && props.categoriesFromDb;
  const list = fromDb ? props.categoriesFromDb : (props.categories ?? []);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide sm:gap-2 sm:pb-1.5">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:px-3.5 sm:py-2 sm:text-sm',
          activeCategoryId === null
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        )}
      >
        {t('category.all')}
      </button>
      {fromDb
        ? (list as CategoryTabItem[]).map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={cn(
                'flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:px-3.5 sm:py-2 sm:text-sm',
                activeCategoryId === cat.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {cat.name}
            </button>
          ))
        : (list as ProductCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => onSelect(category)}
              className={cn(
                'flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:px-3.5 sm:py-2 sm:text-sm',
                activeCategoryId === category
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {t(`legacyCategories.${category}`)}
            </button>
          ))}
    </div>
  );
};
