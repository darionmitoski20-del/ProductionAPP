import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductCategory } from '@/types';
import {
  resolveProductFields,
  resolveAddonOrSizeName,
  resolveCategoryName,
} from '@/lib/localizedContent';

type RawMenuCategory = {
  id: string;
  name: string;
  name_mk?: string | null;
  name_en?: string | null;
  slug: string;
};

type RawProductRow = Record<string, unknown> & {
  id: string;
  name: string;
  name_mk?: string | null;
  name_en?: string | null;
  description: string | null;
  description_mk?: string | null;
  description_en?: string | null;
  price: unknown;
  category: unknown;
  category_id: string | null;
  image_url: string | null;
  available: boolean;
  menu_categories: RawMenuCategory | null;
};

function mapRowToProduct(row: RawProductRow, language: string): Product {
  const cat = row.menu_categories;
  const dbName = String(row.name);
  const name_en = (row.name_en as string | null | undefined) ?? dbName;
  const name_mk = (row.name_mk as string | null | undefined) ?? null;
  const desc = row.description;
  const description_en = (row.description_en as string | null | undefined) ?? desc;
  const description_mk = (row.description_mk as string | null | undefined) ?? null;

  const { name, description } = resolveProductFields(language, {
    name: dbName,
    name_mk,
    name_en,
    description: desc,
    description_mk,
    description_en,
  });

  const categoryName = cat
    ? resolveCategoryName(language, {
        name: cat.name,
        name_mk: cat.name_mk,
        name_en: cat.name_en,
      })
    : undefined;

  const addonsRaw =
    (row as unknown as { _addons?: { id: string; name: string; name_mk?: string | null; name_en?: string | null; price: number; product_id: string }[] })
      ._addons ?? [];
  const sizesRaw =
    (row as unknown as { _sizes?: { id: string; name: string; name_mk?: string | null; name_en?: string | null; price: number; sort_order?: number; product_id: string }[] })
      ._sizes ?? [];

  return {
    id: row.id,
    name,
    description,
    price: Number(row.price),
    category: (row.category as ProductCategory) ?? 'pizzas',
    image_url: row.image_url,
    available: row.available ?? true,
    category_id: row.category_id ?? null,
    category_name: categoryName,
    name_en,
    name_mk,
    description_en: description_en ?? null,
    description_mk,
    addons: addonsRaw.map((a) => ({
      id: a.id,
      name: resolveAddonOrSizeName(language, {
        name: a.name,
        name_mk: a.name_mk,
        name_en: a.name_en ?? a.name,
      }),
      price: Number(a.price),
      name_en: a.name_en ?? a.name,
      name_mk: a.name_mk,
    })),
    sizes: sizesRaw.map((s) => ({
      id: s.id,
      name: resolveAddonOrSizeName(language, {
        name: s.name,
        name_mk: s.name_mk,
        name_en: s.name_en ?? s.name,
      }),
      price: Number(s.price),
      sort_order: Number(s.sort_order ?? 0),
      name_en: s.name_en ?? s.name,
      name_mk: s.name_mk,
    })),
  };
}

export const useProducts = () => {
  const { i18n } = useTranslation();

  const query = useQuery({
    queryKey: ['products'],
    enabled: true,
    queryFn: async (): Promise<RawProductRow[]> => {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(
          `
          id, name, name_mk, name_en, description, description_mk, description_en, price, category, category_id, image_url, available,
          menu_categories(id, name, name_mk, name_en, slug)
        `
        )
        .eq('available', true)
        .order('name');

      if (productsError) throw productsError;

      const productIds = (products ?? []).map((p) => p.id).filter(Boolean) as string[];
      if (productIds.length === 0) return [];

      const { data: addons, error: addonsError } = await supabase
        .from('product_addons')
        .select('id, product_id, name, name_mk, name_en, price, available')
        .in('product_id', productIds)
        .eq('available', true);

      if (addonsError) throw addonsError;

      const { data: sizes, error: sizesError } = await supabase
        .from('product_sizes')
        .select('id, product_id, name, name_mk, name_en, price, sort_order, available')
        .in('product_id', productIds)
        .eq('available', true)
        .order('sort_order')
        .order('name');

      if (sizesError) throw sizesError;

      return (products ?? []).map((p) => {
        const row = p as unknown as RawProductRow;
        const pid = row.id;
        const _addons = (addons ?? []).filter((a: { product_id: string }) => a.product_id === pid);
        const _sizes = (sizes ?? []).filter((s: { product_id: string }) => s.product_id === pid);
        return { ...row, _addons, _sizes } as RawProductRow & {
          _addons: typeof _addons;
          _sizes: typeof _sizes;
        };
      });
    },
  });

  const data = useMemo((): Product[] | undefined => {
    if (!query.data) return undefined;
    return query.data.map((row) => mapRowToProduct(row, i18n.language));
  }, [query.data, i18n.language]);

  return { ...query, data };
};

export const useProductsByCategory = (categoryId: string | null) => {
  const { data: products, ...rest } = useProducts();

  const filteredProducts = categoryId
    ? products?.filter((p) => p.category_id === categoryId)
    : products;

  return { data: filteredProducts, ...rest };
};
