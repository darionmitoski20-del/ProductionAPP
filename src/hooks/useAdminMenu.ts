import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProductCategory } from '@/types';

export interface AdminProductRow {
  id: string;
  name: string;
  name_mk?: string | null;
  name_en?: string | null;
  description: string | null;
  description_mk?: string | null;
  description_en?: string | null;
  price: number;
  category: ProductCategory;
  category_id: string | null;
  image_url: string | null;
  available: boolean;
  created_at: string;
}

export interface ProductAddonRow {
  id: string;
  product_id: string;
  name: string;
  name_mk?: string | null;
  name_en?: string | null;
  price: number;
  available: boolean | null;
}

export interface ProductSizeRow {
  id: string;
  product_id: string;
  name: string;
  name_mk?: string | null;
  name_en?: string | null;
  price: number;
  sort_order: number;
  available: boolean | null;
}

export interface ProductUpsertPayload {
  id?: string;
  /** English; also written to `name` and `name_en`. */
  name: string;
  name_mk?: string | null;
  name_en?: string | null;
  description: string | null;
  description_mk?: string | null;
  description_en?: string | null;
  price: number;
  category: ProductCategory | null;
  category_id: string | null;
  image_url: string | null;
  available: boolean;
}

export interface AddonUpsertPayload {
  id?: string;
  product_id: string;
  name: string;
  name_mk?: string | null;
  name_en?: string | null;
  price: number;
  available: boolean;
}

export interface SizeUpsertPayload {
  id?: string;
  product_id: string;
  name: string;
  name_mk?: string | null;
  name_en?: string | null;
  price: number;
  sort_order: number;
  available: boolean;
}

const ADMIN_PRODUCTS_QUERY_KEY = ['admin', 'products'] as const;
const PRODUCT_ADDONS_QUERY_KEY = (productId: string) => ['admin', 'product-addons', productId] as const;
const PRODUCT_SIZES_QUERY_KEY = (productId: string) => ['admin', 'product-sizes', productId] as const;

const PRODUCT_CATEGORY_VALUES: ProductCategory[] = ['pizzas', 'burgers', 'wraps', 'toasts', 'fries', 'salads', 'drinks'];

function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; status?: number; message?: string };
  if (e.code === 'PGRST301' || e.status === 401 || e.status === 403) return true;
  if (typeof e.message === 'string' && /jwt|unauthorized|forbidden/i.test(e.message)) return true;
  return false;
}

export function useAdminProducts() {
  return useQuery({
    queryKey: [...ADMIN_PRODUCTS_QUERY_KEY],
    enabled: true,
    queryFn: async (): Promise<AdminProductRow[]> => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(
            'id, name, name_mk, name_en, description, description_mk, description_en, price, category, category_id, image_url, available, created_at'
          )
          .order('name');
        if (error) {
          if (isAuthError(error)) {
            console.warn('[useAdminProducts] auth error', error);
            throw new Error('AUTH_REQUIRED');
          }
          throw error;
        }
        return (data ?? []).map((row) => ({
          ...row,
          price: Number(row.price),
          available: row.available ?? true,
          category: (row.category ?? (PRODUCT_CATEGORY_VALUES[0] as ProductCategory)) as ProductCategory,
          category_id: row.category_id ?? null,
        })) as AdminProductRow[];
      } catch (e) {
        console.error('[useAdminProducts] query failed', e);
        throw e;
      }
    },
    refetchOnWindowFocus: true,
  });
}

export function useUpsertProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ProductUpsertPayload) => {
      const { id, category_id, name, name_mk, name_en, description, description_mk, description_en, ...rest } =
        payload;
      const enName = name.trim();
      const row = {
        ...rest,
        name: enName,
        name_en: (name_en ?? enName).trim(),
        name_mk: name_mk?.trim() || null,
        description,
        description_en: description_en ?? description,
        description_mk: description_mk?.trim() || null,
        category_id: category_id ?? null,
      };

      if (id) {
        const { data, error } = await supabase
          .from('products')
          .update({ ...row })
          .eq('id', id)
          .select('id')
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('products')
        .insert({ ...row })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useProductAddons(productId: string | null) {
  return useQuery({
    queryKey: PRODUCT_ADDONS_QUERY_KEY(productId ?? ''),
    queryFn: async (): Promise<ProductAddonRow[]> => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_addons')
        .select('id, product_id, name, name_mk, name_en, price, available')
        .eq('product_id', productId)
        .order('name');
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        price: Number(row.price),
        available: row.available ?? true,
      })) as ProductAddonRow[];
    },
    enabled: !!productId,
  });
}

export function useProductSizes(productId: string | null) {
  return useQuery({
    queryKey: PRODUCT_SIZES_QUERY_KEY(productId ?? ''),
    queryFn: async (): Promise<ProductSizeRow[]> => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('product_sizes')
        .select('id, product_id, name, name_mk, name_en, price, sort_order, available')
        .eq('product_id', productId)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        price: Number(row.price),
        sort_order: Number(row.sort_order ?? 0),
        available: row.available ?? true,
      })) as ProductSizeRow[];
    },
    enabled: !!productId,
  });
}

export function useUpsertAddon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddonUpsertPayload) => {
      const { id, product_id, name, name_mk, name_en, ...rest } = payload;
      const en = name.trim();
      const body = {
        ...rest,
        name: en,
        name_en: (name_en ?? en).trim(),
        name_mk: name_mk?.trim() || null,
      };
      if (id) {
        const { data, error } = await supabase
          .from('product_addons')
          .update(body)
          .eq('id', id)
          .select('id')
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('product_addons')
        .insert({ product_id, ...body })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_ADDONS_QUERY_KEY(variables.product_id) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteAddon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ addonId, productId }: { addonId: string; productId: string }) => {
      const { error } = await supabase.from('product_addons').delete().eq('id', addonId);
      if (error) throw error;
      return { productId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_ADDONS_QUERY_KEY(variables.productId) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpsertSize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SizeUpsertPayload) => {
      const { id, product_id, name, name_mk, name_en, ...rest } = payload;
      const en = name.trim();
      const body = {
        ...rest,
        name: en,
        name_en: (name_en ?? en).trim(),
        name_mk: name_mk?.trim() || null,
      };
      if (id) {
        const { data, error } = await supabase
          .from('product_sizes')
          .update(body)
          .eq('id', id)
          .select('id')
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('product_sizes')
        .insert({ product_id, ...body })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_SIZES_QUERY_KEY(variables.product_id) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteSize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sizeId, productId }: { sizeId: string; productId: string }) => {
      const { error } = await supabase.from('product_sizes').delete().eq('id', sizeId);
      if (error) throw error;
      return { productId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_SIZES_QUERY_KEY(variables.productId) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
