import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { AdminProductRow, ProductAddonRow, ProductSizeRow } from '@/hooks/useAdminMenu';
import type { MenuCategory, MenuCategoryWithCount } from '@/hooks/useCategories';
import type { AppDesignSettings } from '@/types';

function generateId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface DemoProduct extends AdminProductRow {
  _isDemo?: boolean;
  _deleted?: boolean;
}

interface DemoCategory extends MenuCategory {
  _isDemo?: boolean;
  _deleted?: boolean;
}

interface DemoAddon extends ProductAddonRow {
  _isDemo?: boolean;
  _deleted?: boolean;
}

interface DemoSize extends ProductSizeRow {
  _isDemo?: boolean;
  _deleted?: boolean;
}

interface DemoModeState {
  products: Map<string, DemoProduct>;
  categories: Map<string, DemoCategory>;
  addons: Map<string, DemoAddon>;
  sizes: Map<string, DemoSize>;
  designSettings: Partial<AppDesignSettings> | null;
}

interface DemoModeContextValue {
  // Products
  upsertDemoProduct: (product: Partial<AdminProductRow> & { name: string; price: number }) => { id: string };
  deleteDemoProduct: (id: string) => void;
  getDemoProducts: () => DemoProduct[];
  mergeProductsWithDemo: (realProducts: AdminProductRow[]) => AdminProductRow[];

  // Categories
  upsertDemoCategory: (category: Partial<MenuCategory> & { name: string }) => { id: string };
  deleteDemoCategory: (id: string) => void;
  getDemoCategories: () => DemoCategory[];
  mergeCategoriesWithDemo: <T extends MenuCategory>(realCategories: T[]) => T[];

  // Addons
  upsertDemoAddon: (addon: Partial<ProductAddonRow> & { product_id: string; name: string; price: number }) => { id: string };
  deleteDemoAddon: (id: string) => void;
  getDemoAddons: (productId: string) => DemoAddon[];
  mergeAddonsWithDemo: (productId: string, realAddons: ProductAddonRow[]) => ProductAddonRow[];

  // Sizes
  upsertDemoSize: (size: Partial<ProductSizeRow> & { product_id: string; name: string; price: number }) => { id: string };
  deleteDemoSize: (id: string) => void;
  getDemoSizes: (productId: string) => DemoSize[];
  mergeSizesWithDemo: (productId: string, realSizes: ProductSizeRow[]) => ProductSizeRow[];

  // Design Settings
  updateDemoDesignSettings: (settings: Partial<AppDesignSettings>) => AppDesignSettings;
  mergeDesignSettingsWithDemo: (realSettings: AppDesignSettings | null) => AppDesignSettings | null;
  getDemoDesignSettings: () => Partial<AppDesignSettings> | null;

  // Reset
  resetDemoData: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoModeState>({
    products: new Map(),
    categories: new Map(),
    addons: new Map(),
    sizes: new Map(),
    designSettings: null,
  });

  // Products
  const upsertDemoProduct = useCallback((product: Partial<AdminProductRow> & { name: string; price: number }) => {
    const id = product.id || generateId();
    const now = new Date().toISOString();
    setState((prev) => {
      const newProducts = new Map(prev.products);
      const existing = newProducts.get(id);
      const newProduct: DemoProduct = {
        id,
        name: product.name,
        name_mk: product.name_mk ?? null,
        name_en: product.name_en ?? product.name,
        description: product.description ?? null,
        description_mk: product.description_mk ?? null,
        description_en: product.description_en ?? product.description ?? null,
        price: product.price,
        category: product.category ?? 'pizzas',
        category_id: product.category_id ?? null,
        image_url: product.image_url ?? null,
        available: product.available ?? true,
        created_at: existing?.created_at ?? now,
        _isDemo: true,
        _deleted: false,
      };
      newProducts.set(id, newProduct);
      return { ...prev, products: newProducts };
    });
    return { id };
  }, []);

  const deleteDemoProduct = useCallback((id: string) => {
    setState((prev) => {
      const newProducts = new Map(prev.products);
      const existing = newProducts.get(id);
      if (existing) {
        newProducts.set(id, { ...existing, _deleted: true });
      } else {
        newProducts.set(id, {
          id,
          name: '',
          description: null,
          price: 0,
          category: 'pizzas',
          category_id: null,
          image_url: null,
          available: false,
          created_at: new Date().toISOString(),
          _isDemo: true,
          _deleted: true,
        });
      }
      return { ...prev, products: newProducts };
    });
  }, []);

  const getDemoProducts = useCallback(() => {
    return Array.from(state.products.values()).filter((p) => !p._deleted);
  }, [state.products]);

  const mergeProductsWithDemo = useCallback((realProducts: AdminProductRow[]): AdminProductRow[] => {
    const result: AdminProductRow[] = [];
    const demoMap = state.products;

    for (const product of realProducts) {
      const demoVersion = demoMap.get(product.id);
      if (demoVersion?._deleted) continue;
      if (demoVersion) {
        result.push({ ...demoVersion });
      } else {
        result.push(product);
      }
    }

    for (const [id, demoProduct] of demoMap) {
      if (demoProduct._deleted) continue;
      if (!realProducts.some((p) => p.id === id)) {
        result.push({ ...demoProduct });
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [state.products]);

  // Categories
  const upsertDemoCategory = useCallback((category: Partial<MenuCategory> & { name: string }) => {
    const id = category.id || generateId();
    const now = new Date().toISOString();
    setState((prev) => {
      const newCategories = new Map(prev.categories);
      const existing = newCategories.get(id);
      const slug = category.slug || category.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const newCategory: DemoCategory = {
        id,
        name: category.name,
        name_mk: category.name_mk ?? null,
        name_en: category.name_en ?? category.name,
        slug,
        sort_order: category.sort_order ?? 0,
        is_active: category.is_active ?? true,
        created_at: existing?.created_at ?? now,
        updated_at: now,
        _isDemo: true,
        _deleted: false,
      };
      newCategories.set(id, newCategory);
      return { ...prev, categories: newCategories };
    });
    return { id };
  }, []);

  const deleteDemoCategory = useCallback((id: string) => {
    setState((prev) => {
      const newCategories = new Map(prev.categories);
      const existing = newCategories.get(id);
      if (existing) {
        newCategories.set(id, { ...existing, _deleted: true });
      } else {
        newCategories.set(id, {
          id,
          name: '',
          slug: '',
          sort_order: 0,
          is_active: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _isDemo: true,
          _deleted: true,
        });
      }
      return { ...prev, categories: newCategories };
    });
  }, []);

  const getDemoCategories = useCallback(() => {
    return Array.from(state.categories.values()).filter((c) => !c._deleted);
  }, [state.categories]);

  const mergeCategoriesWithDemo = useCallback(<T extends MenuCategory>(realCategories: T[]): T[] => {
    const result: T[] = [];
    const demoMap = state.categories;

    for (const category of realCategories) {
      const demoVersion = demoMap.get(category.id);
      if (demoVersion?._deleted) continue;
      if (demoVersion) {
        result.push({ ...category, ...demoVersion } as T);
      } else {
        result.push(category);
      }
    }

    for (const [id, demoCategory] of demoMap) {
      if (demoCategory._deleted) continue;
      if (!realCategories.some((c) => c.id === id)) {
        result.push({ ...demoCategory, productCount: 0 } as T);
      }
    }

    return result.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
  }, [state.categories]);

  // Addons
  const upsertDemoAddon = useCallback((addon: Partial<ProductAddonRow> & { product_id: string; name: string; price: number }) => {
    const id = addon.id || generateId();
    setState((prev) => {
      const newAddons = new Map(prev.addons);
      const newAddon: DemoAddon = {
        id,
        product_id: addon.product_id,
        name: addon.name,
        name_mk: addon.name_mk ?? null,
        name_en: addon.name_en ?? addon.name,
        price: addon.price,
        available: addon.available ?? true,
        _isDemo: true,
        _deleted: false,
      };
      newAddons.set(id, newAddon);
      return { ...prev, addons: newAddons };
    });
    return { id };
  }, []);

  const deleteDemoAddon = useCallback((id: string) => {
    setState((prev) => {
      const newAddons = new Map(prev.addons);
      const existing = newAddons.get(id);
      if (existing) {
        newAddons.set(id, { ...existing, _deleted: true });
      } else {
        newAddons.set(id, {
          id,
          product_id: '',
          name: '',
          price: 0,
          available: false,
          _isDemo: true,
          _deleted: true,
        });
      }
      return { ...prev, addons: newAddons };
    });
  }, []);

  const getDemoAddons = useCallback((productId: string) => {
    return Array.from(state.addons.values()).filter((a) => a.product_id === productId && !a._deleted);
  }, [state.addons]);

  const mergeAddonsWithDemo = useCallback((productId: string, realAddons: ProductAddonRow[]): ProductAddonRow[] => {
    const result: ProductAddonRow[] = [];
    const demoMap = state.addons;

    for (const addon of realAddons) {
      const demoVersion = demoMap.get(addon.id);
      if (demoVersion?._deleted) continue;
      if (demoVersion) {
        result.push({ ...demoVersion });
      } else {
        result.push(addon);
      }
    }

    for (const [id, demoAddon] of demoMap) {
      if (demoAddon._deleted) continue;
      if (demoAddon.product_id !== productId) continue;
      if (!realAddons.some((a) => a.id === id)) {
        result.push({ ...demoAddon });
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [state.addons]);

  // Sizes
  const upsertDemoSize = useCallback((size: Partial<ProductSizeRow> & { product_id: string; name: string; price: number }) => {
    const id = size.id || generateId();
    setState((prev) => {
      const newSizes = new Map(prev.sizes);
      const newSize: DemoSize = {
        id,
        product_id: size.product_id,
        name: size.name,
        name_mk: size.name_mk ?? null,
        name_en: size.name_en ?? size.name,
        price: size.price,
        sort_order: size.sort_order ?? 0,
        available: size.available ?? true,
        _isDemo: true,
        _deleted: false,
      };
      newSizes.set(id, newSize);
      return { ...prev, sizes: newSizes };
    });
    return { id };
  }, []);

  const deleteDemoSize = useCallback((id: string) => {
    setState((prev) => {
      const newSizes = new Map(prev.sizes);
      const existing = newSizes.get(id);
      if (existing) {
        newSizes.set(id, { ...existing, _deleted: true });
      } else {
        newSizes.set(id, {
          id,
          product_id: '',
          name: '',
          price: 0,
          sort_order: 0,
          available: false,
          _isDemo: true,
          _deleted: true,
        });
      }
      return { ...prev, sizes: newSizes };
    });
  }, []);

  const getDemoSizes = useCallback((productId: string) => {
    return Array.from(state.sizes.values()).filter((s) => s.product_id === productId && !s._deleted);
  }, [state.sizes]);

  const mergeSizesWithDemo = useCallback((productId: string, realSizes: ProductSizeRow[]): ProductSizeRow[] => {
    const result: ProductSizeRow[] = [];
    const demoMap = state.sizes;

    for (const size of realSizes) {
      const demoVersion = demoMap.get(size.id);
      if (demoVersion?._deleted) continue;
      if (demoVersion) {
        result.push({ ...demoVersion });
      } else {
        result.push(size);
      }
    }

    for (const [id, demoSize] of demoMap) {
      if (demoSize._deleted) continue;
      if (demoSize.product_id !== productId) continue;
      if (!realSizes.some((s) => s.id === id)) {
        result.push({ ...demoSize });
      }
    }

    return result.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
  }, [state.sizes]);

  // Design Settings
  const updateDemoDesignSettings = useCallback((settings: Partial<AppDesignSettings>): AppDesignSettings => {
    const now = new Date().toISOString();
    setState((prev) => {
      const merged = {
        ...prev.designSettings,
        ...settings,
        updated_at: now,
      };
      return { ...prev, designSettings: merged };
    });
    return {
      id: settings.id || 'demo-design',
      app_name: settings.app_name || 'FastBite',
      logo_url: settings.logo_url ?? null,
      hero_background_type: settings.hero_background_type || 'gradient',
      hero_gradient_from: settings.hero_gradient_from || '#1a1a2e',
      hero_gradient_to: settings.hero_gradient_to || '#16213e',
      hero_solid_color: settings.hero_solid_color || '#1a1a2e',
      hero_image_url: settings.hero_image_url ?? null,
      hero_title: settings.hero_title || 'РЕСТОРАН МЕНИ',
      hero_subtitle: settings.hero_subtitle || 'Порачај го твоето јадење од нашето мени',
      primary_color: settings.primary_color || '#16a34a',
      secondary_color: settings.secondary_color || '#f97316',
      font_family: settings.font_family || 'DM Sans',
      button_radius: settings.button_radius || 'rounded-xl',
      max_product_quantity: settings.max_product_quantity || 5,
      pickup_location_name: settings.pickup_location_name || 'My Restaurant',
      pickup_location_address: settings.pickup_location_address || '142 Market Street, Floor 1',
      pickup_timing_text: settings.pickup_timing_text || 'ASAP Pickup',
      pickup_phone: settings.pickup_phone || '+389 70 000 000',
      social_facebook_url: settings.social_facebook_url ?? null,
      social_instagram_url: settings.social_instagram_url ?? null,
      updated_at: now,
    };
  }, []);

  const mergeDesignSettingsWithDemo = useCallback((realSettings: AppDesignSettings | null): AppDesignSettings | null => {
    if (!realSettings) return null;
    if (!state.designSettings) return realSettings;
    return {
      ...realSettings,
      ...state.designSettings,
    } as AppDesignSettings;
  }, [state.designSettings]);

  const getDemoDesignSettings = useCallback(() => {
    return state.designSettings;
  }, [state.designSettings]);

  // Reset
  const resetDemoData = useCallback(() => {
    setState({
      products: new Map(),
      categories: new Map(),
      addons: new Map(),
      sizes: new Map(),
      designSettings: null,
    });
  }, []);

  const value: DemoModeContextValue = {
    upsertDemoProduct,
    deleteDemoProduct,
    getDemoProducts,
    mergeProductsWithDemo,
    upsertDemoCategory,
    deleteDemoCategory,
    getDemoCategories,
    mergeCategoriesWithDemo,
    upsertDemoAddon,
    deleteDemoAddon,
    getDemoAddons,
    mergeAddonsWithDemo,
    upsertDemoSize,
    deleteDemoSize,
    getDemoSizes,
    mergeSizesWithDemo,
    updateDemoDesignSettings,
    mergeDesignSettingsWithDemo,
    getDemoDesignSettings,
    resetDemoData,
  };

  return (
    <DemoModeContext.Provider value={value}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}

export function useDemoModeOptional() {
  return useContext(DemoModeContext);
}
