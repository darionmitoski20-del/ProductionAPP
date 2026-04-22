import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const REPORTS_QUERY_KEY = ['admin', 'reports'] as const;

export interface SalesReportDetailRow {
  product_id: string;
  product_name: string;
  category_name: string;
  quantity_sold: number;
  total_revenue: number;
  order_count: number;
  avg_quantity_per_order: number;
}

export interface SalesReportSummary {
  total_orders: number;
  total_items_sold: number;
  total_revenue: number;
  best_selling_product: string;
  best_selling_category: string;
}

export interface SalesReportData {
  summary: SalesReportSummary;
  details: SalesReportDetailRow[];
}

function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function getDateRangeForPreset(
  preset: 'daily' | 'weekly' | 'monthly'
): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const from = new Date(now);

  if (preset === 'daily') {
    from.setDate(now.getDate() - 0);
  } else if (preset === 'weekly') {
    from.setDate(now.getDate() - 6);
  } else {
    from.setMonth(now.getMonth() - 1);
    from.setDate(1);
  }

  return {
    dateFrom: startOfDay(from),
    dateTo: endOfDay(now),
  };
}

export function useSalesReport(dateFrom: string | null, dateTo: string | null, enabled: boolean) {
  const { loading } = useAuth();

  return useQuery({
    queryKey: [...REPORTS_QUERY_KEY, dateFrom, dateTo],
    queryFn: async (): Promise<SalesReportData> => {
      if (!dateFrom || !dateTo) {
        return {
          summary: {
            total_orders: 0,
            total_items_sold: 0,
            total_revenue: 0,
            best_selling_product: '—',
            best_selling_category: '—',
          },
          details: [],
        };
      }

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .neq('status', 'CANCELED');

      if (ordersError) throw ordersError;
      const orderList = orders ?? [];
      const orderIds = orderList.map((o) => o.id);

      if (orderIds.length === 0) {
        return {
          summary: {
            total_orders: 0,
            total_items_sold: 0,
            total_revenue: 0,
            best_selling_product: '—',
            best_selling_category: '—',
          },
          details: [],
        };
      }

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, product_id, product_name, quantity, subtotal')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;
      const itemList = items ?? [];

      const productIds = [...new Set(itemList.map((i) => i.product_id).filter(Boolean))] as string[];
      const productIdSet = new Set(productIds);

      const { data: products } = await supabase
        .from('products')
        .select('id, name, category_id')
        .in('id', productIds);

      const categoryIds = [
        ...new Set(
          (products ?? []).map((p) => p.category_id).filter((id): id is string => id != null)
        ),
      ];
      const { data: categories } = await supabase
        .from('menu_categories')
        .select('id, name')
        .in('id', categoryIds);

      const categoryByName = new Map<string, string>(
        (categories ?? []).map((c) => [c.id, c.name ?? '—'])
      );
      const productMeta = new Map(
        (products ?? []).map((p) => [
          p.id,
          { name: p.name, category_name: categoryByName.get(p.category_id ?? '') ?? 'Uncategorized' },
        ])
      );

      const byProduct = new Map<
        string,
        { product_name: string; category_name: string; qty: number; revenue: number; orderIds: Set<string> }
      >();

      for (const row of itemList) {
        const pid = row.product_id;
        const meta = productMeta.get(pid) ?? {
          name: row.product_name ?? 'Unknown',
          category_name: 'Uncategorized',
        };
        const cur = byProduct.get(pid) ?? {
          product_name: meta.name,
          category_name: meta.category_name,
          qty: 0,
          revenue: 0,
          orderIds: new Set<string>(),
        };
        cur.qty += Number(row.quantity) || 0;
        cur.revenue += Number(row.subtotal) || 0;
        cur.orderIds.add(row.order_id);
        byProduct.set(pid, cur);
      }

      const details: SalesReportDetailRow[] = [...byProduct.entries()].map(
        ([product_id, { product_name, category_name, qty, revenue, orderIds: oids }]) => ({
          product_id,
          product_name,
          category_name,
          quantity_sold: qty,
          total_revenue: revenue,
          order_count: oids.size,
          avg_quantity_per_order: oids.size > 0 ? Math.round((qty / oids.size) * 100) / 100 : 0,
        })
      );

      details.sort((a, b) => b.total_revenue - a.total_revenue);

      const total_orders = orderList.length;
      const total_items_sold = details.reduce((s, d) => s + d.quantity_sold, 0);
      const total_revenue = orderList.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const bestProduct = details.length
        ? details.reduce((a, b) => (a.quantity_sold >= b.quantity_sold ? a : b)).product_name
        : '—';
      const byCategory = new Map<string, { qty: number; name: string }>();
      for (const d of details) {
        const cur = byCategory.get(d.category_name) ?? { qty: 0, name: d.category_name };
        cur.qty += d.quantity_sold;
        byCategory.set(d.category_name, cur);
      }
      const bestCategory =
        [...byCategory.entries()].sort((a, b) => b[1].qty - a[1].qty)[0]?.[1]?.name ?? '—';

      return {
        summary: {
          total_orders,
          total_items_sold,
          total_revenue,
          best_selling_product: bestProduct,
          best_selling_category: bestCategory,
        },
        details,
      };
    },
    enabled: enabled && !!dateFrom && !!dateTo && !loading,
  });
}
