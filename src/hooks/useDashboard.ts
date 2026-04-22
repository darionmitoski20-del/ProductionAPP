import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import type { OrderStatus } from '@/types';
import { displayStoredProductName } from '@/lib/localizedContent';

const DASHBOARD_QUERY_KEY = ['admin', 'dashboard'] as const;

function startOfTodayUTC(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfDaysAgoUTC(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export interface DashboardStats {
  todayRevenue: number;
  ordersToday: number;
  pendingOrdersToday: number;
  activeUsers: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, 'stats'],
    enabled: true,
    queryFn: async (): Promise<DashboardStats> => {
      const fromToday = startOfTodayUTC();

      const [ordersRes, usersRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total, status, created_at')
          .gte('created_at', fromToday),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (usersRes.error) throw usersRes.error;

      const orders = ordersRes.data ?? [];
      const todayRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
      const ordersToday = orders.length;
      const pendingStatuses: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING'];
      const pendingOrdersToday = orders.filter((o) =>
        pendingStatuses.includes((o.status as OrderStatus) ?? '')
      ).length;

      return {
        todayRevenue,
        ordersToday,
        pendingOrdersToday,
        activeUsers: usersRes.count ?? 0,
      };
    },
  });
}

export interface RecentOrderRow {
  id: string;
  order_number: number;
  customer_name: string;
  items_summary: string;
  status: OrderStatus;
  total: number;
  created_at: string;
}

const MAX_ITEMS_IN_SUMMARY = 3;

function formatItemsSummary(rows: { quantity: number; product_name: string }[]): string {
  if (rows.length === 0) return '—';
  const parts = rows.slice(0, MAX_ITEMS_IN_SUMMARY).map(
    (r) => `${r.quantity}x ${r.product_name?.trim() || 'Item'}`
  );
  const more = rows.length > MAX_ITEMS_IN_SUMMARY;
  return more ? `${parts.join(', ')}…` : parts.join(', ');
}

export function useRecentOrders(limit = 5) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, 'recent-orders', limit],
    enabled: true,
    queryFn: async (): Promise<RecentOrderRow[]> => {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, customer_name, status, total, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (ordersError) throw ordersError;
      const orders = ordersData ?? [];
      if (orders.length === 0) return [];

      const orderIds = orders.map((o) => o.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, product_name, quantity')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      const itemsByOrder = new Map<string, { quantity: number; product_name: string }[]>();
      for (const row of itemsData ?? []) {
        const list = itemsByOrder.get(row.order_id) ?? [];
        list.push({
          quantity: Number(row.quantity) || 1,
          product_name: row.product_name ?? 'Item',
        });
        itemsByOrder.set(row.order_id, list);
      }

      return orders.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name ?? '',
        items_summary: formatItemsSummary(itemsByOrder.get(o.id) ?? []),
        status: (o.status ?? 'PENDING') as OrderStatus,
        total: Number(o.total),
        created_at: o.created_at,
      }));
    },
  });
}

export interface TrendingItemRow {
  product_id: string;
  product_name: string;
  sold: number;
  name_canonical: string | null;
  name_en: string | null;
  name_mk: string | null;
}

export type TrendingItemView = TrendingItemRow & { displayName: string };

export function useTrendingItems(limit = 5) {
  const { i18n } = useTranslation();

  const query = useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, 'trending', limit],
    enabled: true,
    queryFn: async (): Promise<TrendingItemRow[]> => {
      const fromToday = startOfTodayUTC();
      const from7Days = startOfDaysAgoUTC(7);

      const { data: ordersToday } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', fromToday);

      const orderIds = (ordersToday ?? []).map((o) => o.id);
      let from = fromToday;
      if (orderIds.length === 0) {
        from = from7Days;
        const { data: orders7 } = await supabase
          .from('orders')
          .select('id')
          .gte('created_at', from7Days);
        orderIds.push(...(orders7 ?? []).map((o) => o.id));
      }

      if (orderIds.length === 0) return [];

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, product_name, quantity')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      const byProduct = new Map<string, { name: string; sold: number }>();
      for (const row of items ?? []) {
        const cur = byProduct.get(row.product_id) ?? {
          name: row.product_name ?? 'Unknown',
          sold: 0,
        };
        cur.sold += Number(row.quantity ?? 0);
        byProduct.set(row.product_id, cur);
      }

      const sorted = [...byProduct.entries()]
        .map(([product_id, { name: product_name, sold }]) => ({
          product_id,
          product_name,
          sold,
        }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, limit);

      if (sorted.length === 0) return [];

      const ids = sorted.map((r) => r.product_id);
      const { data: prodRows, error: prodError } = await supabase
        .from('products')
        .select('id, name, name_mk, name_en')
        .in('id', ids);

      if (prodError) throw prodError;

      const meta = new Map((prodRows ?? []).map((p) => [p.id, p]));

      return sorted.map((row) => {
        const p = meta.get(row.product_id);
        return {
          ...row,
          name_canonical: p?.name ?? null,
          name_en: p?.name_en ?? p?.name ?? null,
          name_mk: p?.name_mk ?? null,
        };
      });
    },
  });

  const data = useMemo((): TrendingItemView[] | undefined => {
    if (!query.data) return undefined;
    return query.data.map((row) => ({
      ...row,
      displayName: displayStoredProductName(i18n.language, {
        name: row.name_canonical ?? row.product_name,
        name_en: row.name_en ?? row.name_canonical,
        name_mk: row.name_mk,
      }),
    }));
  }, [query.data, i18n.language]);

  return { ...query, data };
}
