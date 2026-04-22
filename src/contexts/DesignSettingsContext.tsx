import { createContext, useContext, useEffect, useMemo } from 'react';
import { useDesignSettings } from '@/hooks/useDesignSettings';
import { hexToHsl } from '@/lib/hexToHsl';
import type { AppDesignSettings } from '@/types';

const FONT_GOOGLE_MAP: Record<string, string> = {
  'DM Sans': 'DM+Sans:wght@300;400;500;600;700',
  Inter: 'Inter:wght@400;500;600;700;800;900',
  Poppins: 'Poppins:wght@400;500;600;700;800',
  Montserrat: 'Montserrat:wght@400;500;600;700;800',
  Roboto: 'Roboto:wght@400;500;700',
};

const DEFAULT_SETTINGS: AppDesignSettings = {
  id: '',
  app_name: 'FastBite',
  logo_url: null,
  hero_background_type: 'image',
  hero_gradient_from: '#1a1a2e',
  hero_gradient_to: '#16213e',
  hero_solid_color: '#1a1a2e',
  hero_image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1920&q=80',
  hero_title: 'РЕСТОРАН МЕНИ',
  hero_subtitle: 'Порачај го твоето јадење од нашето мени',
  primary_color: '#16a34a',
  secondary_color: '#f97316',
  font_family: 'DM Sans',
  button_radius: 'rounded-xl',
  max_product_quantity: 5,
  pickup_title: 'Pickup from FastBite',
  pickup_location_name: 'My Restaurant',
  pickup_location_address: '142 Market Street, Floor 1',
  pickup_timing_text: 'ASAP Pickup',
  pickup_phone: '+389 70 000 000',
  timezone: 'Europe/Skopje',
  social_facebook_url: null,
  social_instagram_url: null,
  updated_at: '',
};

const BUTTON_RADIUS_TO_REM: Record<string, string> = {
  'rounded-md': '0.375rem',
  'rounded-lg': '0.5rem',
  'rounded-xl': '0.75rem',
  'rounded-2xl': '1rem',
  'rounded-full': '9999px',
};

type DesignSettingsContextValue = {
  settings: AppDesignSettings;
  isLoading: boolean;
};

const DesignSettingsContext = createContext<DesignSettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  isLoading: true,
});

export function DesignSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useDesignSettings();
  const settings = data ?? DEFAULT_SETTINGS;

  useEffect(() => {
    if (isLoading || !data) return;
    const root = document.documentElement;
    const primaryHsl = hexToHsl(settings.primary_color);
    const secondaryHsl = hexToHsl(settings.secondary_color);
    root.style.setProperty('--primary', primaryHsl);
    root.style.setProperty('--primary-foreground', '0 0% 100%');
    root.style.setProperty('--secondary', secondaryHsl);
    root.style.setProperty('--ring', primaryHsl);
    root.style.setProperty('--sidebar-primary', primaryHsl);
    root.style.setProperty('--sidebar-ring', primaryHsl);
    const radius = BUTTON_RADIUS_TO_REM[settings.button_radius] ?? '0.75rem';
    root.style.setProperty('--radius', radius);
    root.style.fontFamily = `'${settings.font_family}', ui-sans-serif, system-ui, sans-serif`;
    document.body.style.fontFamily = `'${settings.font_family}', ui-sans-serif, system-ui, sans-serif`;

    const fontSpec = FONT_GOOGLE_MAP[settings.font_family];
    if (fontSpec) {
      let link = document.querySelector<HTMLLinkElement>('link[data-design-font]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'stylesheet';
        link.setAttribute('data-design-font', 'true');
        document.head.appendChild(link);
      }
      link.href = `https://fonts.googleapis.com/css2?family=${fontSpec}&display=swap`;
    }
  }, [data, isLoading, settings.primary_color, settings.secondary_color, settings.font_family]);

  const value = useMemo(
    () => ({ settings, isLoading }),
    [settings, isLoading]
  );

  return (
    <DesignSettingsContext.Provider value={value}>
      {children}
    </DesignSettingsContext.Provider>
  );
}

export function useDesignSettingsContext() {
  return useContext(DesignSettingsContext);
}
