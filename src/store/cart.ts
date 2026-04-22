import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, CartItemAddon, ProductSize } from '@/types';

/** Default max quantity when not provided by design settings. */
export const DEFAULT_MAX_QUANTITY = 5;

const clampQuantity = (qty: number, max: number = DEFAULT_MAX_QUANTITY) =>
  Math.max(1, Math.min(max, qty));

interface CartState {
  items: CartItem[];
  addItem: (
    product: Product,
    quantity: number,
    addons: CartItemAddon[],
    comment: string,
    maxQuantity?: number,
    selectedSize?: ProductSize
  ) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number, maxQuantity?: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product, quantity, addons, comment, maxQuantity = DEFAULT_MAX_QUANTITY, selectedSize) => {
        const qty = clampQuantity(quantity, maxQuantity);
        const addonTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
        const basePrice = selectedSize?.price ?? product.price;
        const unitPrice = basePrice + addonTotal;
        const subtotal = unitPrice * qty;
        
        const newItem: CartItem = {
          id: `${product.id}-${Date.now()}`,
          product,
          selectedSize,
          quantity: qty,
          addons,
          comment,
          unitPrice,
          subtotal,
        };
        
        set((state) => ({
          items: [...state.items, newItem],
        }));
      },
      
      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
      },
      
      updateQuantity: (itemId, quantity, maxQuantity = DEFAULT_MAX_QUANTITY) => {
        const qty = clampQuantity(quantity, maxQuantity);
        if (qty <= 0) {
          get().removeItem(itemId);
          return;
        }
        
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? { ...item, quantity: qty, subtotal: item.unitPrice * qty }
              : item
          ),
        }));
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.subtotal, 0);
      },
      
      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'fastbite-cart',
    }
  )
);
