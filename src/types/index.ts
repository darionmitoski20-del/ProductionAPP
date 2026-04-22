export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'CANCELED';

export type ProductCategory = 'pizzas' | 'burgers' | 'wraps' | 'toasts' | 'fries' | 'salads' | 'drinks';

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
  selected?: boolean;
  /** DB bilingual fields (for re-localizing cart when language changes). */
  name_mk?: string | null;
  name_en?: string | null;
}

export interface ProductSize {
  id: string;
  name: string;
  price: number;
  sort_order?: number;
  name_mk?: string | null;
  name_en?: string | null;
}

export interface Product {
  id: string;
  /** Localized label for current UI language (customer views). */
  name: string;
  /** Localized description for current UI language. */
  description: string | null;
  price: number;
  category: ProductCategory;
  image_url: string | null;
  available: boolean;
  addons?: ProductAddon[];
  sizes?: ProductSize[];
  /** Set when products are loaded with menu_categories join (customer menu, filtering). */
  category_id?: string | null;
  category_name?: string;
  /** Canonical English name from DB (`name` / `name_en`). */
  name_en?: string | null;
  name_mk?: string | null;
  description_en?: string | null;
  description_mk?: string | null;
}

export interface CartItemAddon {
  id: string;
  name: string;
  price: number;
  name_mk?: string | null;
  name_en?: string | null;
}

export interface CartItem {
  id: string;
  product: Product;
  selectedSize?: ProductSize;
  quantity: number;
  addons: CartItemAddon[];
  comment: string;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: number;
  customer_name: string;
  phone: string;
  pickup_time_option: string;
  pickup_time: string | null;
  order_note: string | null;
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  /** Segmented ETA timestamps/config */
  accepted_at?: string | null;
  preparing_started_at?: string | null;
  ready_at?: string | null;
  accepted_buffer_minutes?: number | null;
  preparing_duration_minutes?: number | null;
  /** Audit: who accepted the order */
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  confirmed_by_email?: string | null;
  /** Audit: who canceled the order */
  canceled_by?: string | null;
  canceled_at?: string | null;
  canceled_by_email?: string | null;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  addons: CartItemAddon[];
  comment: string | null;
  subtotal: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PREPARING: 'In Preparation',
  READY: 'Ready for Pickup',
  CANCELED: 'Canceled',
};

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  pizzas: 'Pizzas',
  burgers: 'Burgers',
  wraps: 'Wraps',
  toasts: 'Toasts',
  fries: 'Fries',
  salads: 'Salads',
  drinks: 'Drinks',
};

export type HeroBackgroundType = 'gradient' | 'solid' | 'image';

export type ButtonRadiusOption = 'rounded-md' | 'rounded-lg' | 'rounded-xl' | 'rounded-2xl' | 'rounded-full';

export interface AppDesignSettings {
  id: string;
  app_name: string;
  logo_url: string | null;
  hero_background_type: HeroBackgroundType;
  hero_gradient_from: string;
  hero_gradient_to: string;
  hero_solid_color: string;
  hero_image_url: string | null;
  hero_title: string;
  hero_subtitle: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  button_radius: ButtonRadiusOption;
  /** Max quantity per product in cart (admin-configurable, default 5). */
  max_product_quantity: number;
  /** Order details: pickup section title. */
  pickup_title?: string | null;
  /** Order details: location name shown in pickup card. */
  pickup_location_name?: string | null;
  /** Order details: location address shown in pickup card. */
  pickup_location_address?: string | null;
  /** Order details: ASAP pickup text. */
  pickup_timing_text?: string | null;
  /** Order details: contact phone shown to customers. */
  pickup_phone?: string | null;
  /** IANA timezone for business hours (e.g. Europe/Skopje). */
  timezone?: string | null;
  /** Public menu footer: Facebook page URL (optional). */
  social_facebook_url?: string | null;
  /** Public menu footer: Instagram profile URL (optional). */
  social_instagram_url?: string | null;
  updated_at: string;
}

/** day_of_week 0=Sunday, 1=Monday, ... 6=Saturday (JS getDay()). */
export interface BusinessHoursDay {
  id?: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Keys for `hours.weekdays.*` translations (plus `tomorrow`). */
export type WeekdayTranslationKey =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'tomorrow';

export type RestaurantStatusI18n =
  | { key: 'hours.openNow' }
  | { key: 'hours.closedToday' }
  | { key: 'hours.closedForToday' }
  | { key: 'hours.closedOpensAt'; time: string }
  | { key: 'hours.closedOpensLaterAt'; dayKey: WeekdayTranslationKey; time: string }
  | { key: 'hours.onBreakResumes'; time: string };

export interface RestaurantOpenState {
  isOpen: boolean;
  isOnBreak: boolean;
  /** Legacy English/debug text; prefer `statusI18n` for UI. */
  statusMessage: string;
  statusI18n: RestaurantStatusI18n;
  nextOpenAt: string | null;
}
