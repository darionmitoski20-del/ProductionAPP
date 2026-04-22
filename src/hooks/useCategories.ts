import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MenuCategory {
  id: string;
  name: string;
  name_mk?: string | null;
  name_en?: string | null;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const CATEGORIES_QUERY_KEY = ['categories'] as const;
export const MENU_CATEGORIES_QUERY_KEY = ['menu_categories'] as const;

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    || 'category';
}

/** Categories with product count. Count = products where category_id = id OR (category_id null && category = slug). */
export interface MenuCategoryWithCount extends MenuCategory {
  productCount: number;
}

export function useCategoriesWithCounts() {
  return useQuery({
    queryKey: [...MENU_CATEGORIES_QUERY_KEY, 'with-counts'],
    enabled: true,
    queryFn: async (): Promise<MenuCategoryWithCount[]> => {
      const [catRes, prodRes] = await Promise.all([
        supabase
          .from('menu_categories')
          .select('id, name, name_mk, name_en, slug, sort_order, is_active, created_at, updated_at')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('products')
          .select('category_id, category'),
      ]);
      if (catRes.error) throw catRes.error;
      if (prodRes.error) throw prodRes.error;
      const categories = (catRes.data ?? []) as MenuCategory[];
      const products = prodRes.data ?? [];
      const countByCategoryId = new Map<string, number>();
      const countBySlug = new Map<string, number>();
      for (const p of products) {
        const cid = p.category_id ?? null;
        const slug = p.category ?? null;
        if (cid) countByCategoryId.set(cid, (countByCategoryId.get(cid) ?? 0) + 1);
        else if (slug) countBySlug.set(slug, (countBySlug.get(slug) ?? 0) + 1);
      }
      return categories.map((c) => ({
        ...c,
        sort_order: c.sort_order ?? 0,
        is_active: c.is_active ?? true,
        productCount: (countByCategoryId.get(c.id) ?? 0) + (countBySlug.get(c.slug) ?? 0),
      })) as MenuCategoryWithCount[];
    },
  });
}

/** Fetches categories. RLS: public sees active only; staff/admin see all. */
export function useCategories() {
  return useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY],
    enabled: true,
    queryFn: async (): Promise<MenuCategory[]> => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('id, name, name_mk, name_en, slug, sort_order, is_active, created_at, updated_at')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        sort_order: row.sort_order ?? 0,
        is_active: row.is_active ?? true,
      })) as MenuCategory[];
    },
  });
}

export interface CreateCategoryPayload {
  /** English / canonical name (stored in `name` and `name_en`). */
  name: string;
  name_mk?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

/** Fetch max sort_order so new categories appear last. */
async function getNextSortOrder(): Promise<number> {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data?.sort_order ?? 0) + 1;
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCategoryPayload) => {
      const name = payload.name?.trim();
      if (!name) throw new Error('Category name is required');
      const slug = slugFromName(name);
      const sort_order = payload.sort_order ?? (await getNextSortOrder());
      const name_mk = payload.name_mk?.trim() || null;
      const { data, error } = await supabase
        .from('menu_categories')
        .insert({
          name,
          name_en: name,
          name_mk,
          slug,
          sort_order,
          is_active: payload.is_active ?? true,
        })
        .select('id')
        .single();
      if (error) {
        if (error.code === '23505') {
          if (error.message.includes('name_lower')) throw new Error('A category with this name already exists');
          throw new Error('A category with this slug already exists');
        }
        throw new Error(error.message || 'Failed to create category');
      }
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export interface UpdateCategoryPayload {
  name?: string;
  name_mk?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string } & UpdateCategoryPayload) => {
      if (!id) throw new Error('Category id is required');
      const body: Record<string, unknown> = {};
      if (payload.name !== undefined) {
        const name = payload.name.trim();
        if (!name) throw new Error('Category name is required');
        body.name = name;
        body.name_en = name;
        body.slug = slugFromName(name);
      }
      if (payload.name_mk !== undefined) {
        body.name_mk = payload.name_mk?.trim() || null;
      }
      if (payload.sort_order !== undefined) body.sort_order = payload.sort_order;
      if (payload.is_active !== undefined) body.is_active = payload.is_active;
      if (Object.keys(body).length === 0) return { id };
      const { data, error } = await supabase
        .from('menu_categories')
        .update(body)
        .eq('id', id)
        .select('id')
        .single();
      if (error) {
        if (error.code === '23505') {
          if (error.message.includes('name_lower')) throw new Error('A category with this name already exists');
          throw new Error('A category with this slug already exists');
        }
        throw new Error(error.message || 'Failed to update category');
      }
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export interface DeleteCategoryUncategorizeResult {
  moved_count: number;
  deleted: boolean;
}

/**
 * Atomic delete: uncategorize products then delete category via RPC.
 * Throws on any DB error. Only resolve when category is actually deleted.
 */
export async function deleteCategoryUncategorizeRpc(
  categoryId: string
): Promise<DeleteCategoryUncategorizeResult> {
  const { data, error } = await supabase.rpc('delete_category_uncategorize', {
    p_category_id: categoryId,
  });
  if (error) {
    console.error('[deleteCategoryUncategorize] failed', { categoryId, error });
    throw error;
  }
  const result = data as DeleteCategoryUncategorizeResult | null;
  if (!result || result.deleted !== true) {
    console.error('[deleteCategoryUncategorize] unexpected result', { categoryId, data });
    throw new Error('Category was not deleted');
  }
  return result;
}

/**
 * Mutation: atomic delete category (RPC). Invalidates categories and products queries.
 * Use this for all category deletes so UI and DB stay in sync.
 */
export function useDeleteCategoryAtomic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCategoryUncategorizeRpc,
    onSuccess: (_, categoryId) => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MENU_CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...MENU_CATEGORIES_QUERY_KEY, 'with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Optimistic removal from with-counts list
      queryClient.setQueryData(
        [...MENU_CATEGORIES_QUERY_KEY, 'with-counts'] as const,
        (old: MenuCategoryWithCount[] | undefined) =>
          old ? old.filter((c) => c.id !== categoryId) : old
      );
    },
  });
}

/** Set products currently linked only by slug (category = oldSlug, category_id null) to category_id = id. Returns updated count. */
export async function syncProductsToCategoryId(
  categoryId: string,
  oldSlug: string
): Promise<number> {
  const { data, error } = await supabase
    .from('products')
    .update({ category_id: categoryId })
    .eq('category', oldSlug)
    .is('category_id', null)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}
