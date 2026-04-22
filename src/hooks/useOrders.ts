import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderItem, OrderStatus, CartItem } from '@/types';
import { useEffect } from 'react';
import { fetchShopOpenState } from '@/lib/businessHours';
import { OrderClosedError } from '@/lib/orderErrors';

const normalizeOrderStatus = (status: string): OrderStatus => {
  const valid: OrderStatus[] = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'CANCELED'];
  return valid.includes(status as OrderStatus) ? (status as OrderStatus) : 'PENDING';
};

export const useOrder = (orderId: string | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (orderError) throw orderError;
      
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      
      if (itemsError) throw itemsError;
      
      return {
        ...order,
        status: order.status as OrderStatus,
        total: Number(order.total),
        items: items.map((item) => ({
          ...item,
          unit_price: Number(item.unit_price),
          subtotal: Number(item.subtotal),
          addons: (item.addons as any[]) || [],
        })),
      } as Order;
    },
    enabled: !!orderId,
    // Background polling for tracking page; stop once order is final.
    refetchInterval: (query) => {
      const current = query.state.data as Order | null | undefined;
      if (current?.status === 'READY' || current?.status === 'CANCELED') {
        return false;
      }
      return current?.status === 'PREPARING' ? 1000 : 2000;
    },
  });

  // Real-time subscription for order updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          queryClient.setQueryData(['order', orderId], (old: Order | null) => {
            if (!old) return old;
            return {
              ...old,
              ...payload.new,
              status: normalizeOrderStatus(payload.new.status),
              total: Number(payload.new.total),
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, queryClient]);

  return query;
};

export const useOrdersByIds = (orderIds: string[]) => {
  const ids = [...new Set(orderIds.filter(Boolean))];

  return useQuery({
    queryKey: ['orders-by-ids', ids.join(',')],
    enabled: ids.length > 0,
    queryFn: async (): Promise<Order[]> => {
      if (ids.length === 0) return [];

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .in('id', ids)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!orders || orders.length === 0) return [];

      const fetchedOrderIds = orders.map((o) => o.id);
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .in('order_id', fetchedOrderIds);

      if (itemsError) throw itemsError;

      return orders.map((order) => ({
        ...order,
        status: order.status as OrderStatus,
        total: Number(order.total),
        items: (items ?? [])
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            ...item,
            unit_price: Number(item.unit_price),
            subtotal: Number(item.subtotal),
            addons: (item.addons as any[]) || [],
          })),
      })) as Order[];
    },
  });
};

export interface UseOrdersOptions {
  /** Polling interval in ms (e.g. 2000 for Kitchen fallback). Cleared when component unmounts. */
  refetchInterval?: number;
}

export const useOrders = (statusFilter?: OrderStatus[], options?: UseOrdersOptions) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['orders', statusFilter],
    enabled: true,
    refetchInterval: options?.refetchInterval,
    queryFn: async () => {
      let queryBuilder = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter && statusFilter.length > 0) {
        queryBuilder = queryBuilder.in('status', statusFilter as any);
      }
      
      const { data: orders, error } = await queryBuilder;
      
      if (error) throw error;
      
      // Fetch all order items
      const orderIds = orders.map((o) => o.id);
      if (orderIds.length === 0) return [] as Order[];

      const itemsQuery = supabase
        .from('order_items')
        .select('*')
        .in('order_id', orderIds);

      const { data: items, error: itemsError } = await itemsQuery;
      
      if (itemsError) throw itemsError;
      
      return orders.map((order) => ({
        ...order,
        status: order.status as OrderStatus,
        total: Number(order.total),
        items: items
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            ...item,
            unit_price: Number(item.unit_price),
            subtotal: Number(item.subtotal),
            addons: (item.addons as any[]) || [],
          })),
      })) as Order[];
    },
  });

  // Real-time subscription: refetch kitchen orders list on INSERT/UPDATE/DELETE.
  useEffect(() => {
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('[useOrders] realtime payload received', {
            eventType: (payload as { eventType?: string }).eventType ?? (payload as { event?: string }).event,
            payload,
          });
          queryClient.refetchQueries({ queryKey: ['orders'] });
          console.log('[useOrders] query refetch executed for key', ['orders']);
        }
      )
      .subscribe((status, err) => {
        console.log('[useOrders] subscription status', { status, err: err?.message });
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

interface CreateOrderData {
  customerName: string;
  phone: string;
  pickupTimeOption: string;
  pickupTime: Date | null;
  orderNote: string;
  items: CartItem[];
  total: number;
}

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrderData) => {
      const openState = await fetchShopOpenState();
      if (!openState.isOpen) {
        throw new OrderClosedError(openState.statusI18n);
      }

      const orderInsertPayload = {
        customer_name: data.customerName,
        phone: data.phone,
        pickup_time_option: data.pickupTimeOption,
        pickup_time: data.pickupTime?.toISOString() || null,
        order_note: data.orderNote || null,
        total: data.total,
        status: 'PENDING' as any,
      };

      console.log('[useCreateOrder] inserting order payload', orderInsertPayload);

      const { data: orderRow, error: orderError } = await supabase
        .from('orders')
        .insert(orderInsertPayload)
        .select()
        .single();

      if (orderError) {
        console.error('[useCreateOrder] Order insert failed.', {
          orderInsertPayload,
          orderError,
        });
        throw orderError;
      }

      const order = orderRow as { id: string; created_at?: string };

      const orderItems = data.items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.selectedSize
          ? `${item.product.name} (${item.selectedSize.name})`
          : item.product.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        addons: JSON.parse(JSON.stringify(item.addons)),
        comment: item.comment || null,
        subtotal: item.subtotal,
      }));
      console.log('[useCreateOrder] inserting order items payload', orderItems);

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) {
        console.error('[useCreateOrder] Order items insert failed.', {
          orderId: order.id,
          orderItems,
          itemsError,
        });
        throw itemsError;
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

/**
 * @deprecated No-op. New orders start as PENDING; kitchen approves to ACCEPTED.
 * Kept so stale imports (e.g. from HMR cache) do not break the app.
 */
export const useConfirmOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (_: { orderId: string; callerEmail?: string | null }) => ({ ok: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
};

/** Cancel order (ACCEPTED or PREPARING only). Uses RPC for audit. */
export const useCancelOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      reason,
      callerEmail,
    }: {
      orderId: string;
      reason?: string | null;
      callerEmail?: string | null;
    }) => {
      const { data, error } = await supabase.rpc('cancel_order', {
        _order_id: orderId,
        _reason: reason ?? null,
        _caller_email: callerEmail ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

/** Customer cancel from tracking page: only while order is ACCEPTED. */
export const useCancelCustomerOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      phone,
      customerName,
    }: {
      orderId: string;
      phone: string;
      customerName?: string | null;
    }) => {
      const rpcName = 'cancel_order';
      const rpcArgs = {
        _order_id: orderId,
        _reason: customerName
          ? `Canceled by customer: ${customerName}`
          : 'Canceled by customer',
        _caller_email: null,
      };
      console.log('[useCancelCustomerOrder] calling RPC', {
        rpcName,
        rpcArgs,
        phone,
      });
      const { data, error } = await supabase.rpc(rpcName, rpcArgs);
      if (error) {
        console.error('[useCancelCustomerOrder] RPC failed', {
          rpcName,
          rpcArgs,
          error,
        });
        throw error;
      }
      // Ensure canceled_at is set once when customer cancels.
      const ts = new Date().toISOString();
      const { error: tsError } = await supabase
        .from('orders')
        .update({ canceled_at: ts })
        .eq('id', orderId)
        .is('canceled_at', null);
      if (tsError) {
        console.error('[useCancelCustomerOrder] failed to set canceled_at', {
          orderId,
          tsError,
        });
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

/** Update order status (PENDING→ACCEPTED, ACCEPTED→PREPARING, PREPARING→READY). Uses RPC. */
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { data, error } = await supabase.rpc('update_order_status', {
        _order_id: orderId,
        _new_status: status,
      });
      if (error) throw error;
      // Ensure ready_at / canceled_at are written once when status changes.
      if (status === 'READY') {
        const ts = new Date().toISOString();
        const { error: tsError } = await supabase
          .from('orders')
          .update({ ready_at: ts })
          .eq('id', orderId)
          .is('ready_at', null);
        if (tsError) {
          console.error('[useUpdateOrderStatus] failed to set ready_at', { orderId, tsError });
        }
      } else if (status === 'CANCELED') {
        const ts = new Date().toISOString();
        const { error: tsError } = await supabase
          .from('orders')
          .update({ canceled_at: ts })
          .eq('id', orderId)
          .is('canceled_at', null);
        if (tsError) {
          console.error('[useUpdateOrderStatus] failed to set canceled_at', { orderId, tsError });
        }
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};
