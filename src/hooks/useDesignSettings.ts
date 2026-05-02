import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoModeOptional } from '@/contexts/DemoModeContext';
import type { AppDesignSettings } from '@/types';

const DESIGN_SETTINGS_QUERY_KEY = ['design-settings'] as const;

function parsePickupTitle(value: unknown): { name: string; address: string } {
  const raw = value != null ? String(value).trim() : '';
  if (!raw) {
    return { name: 'My Restaurant', address: '142 Market Street, Floor 1' };
  }
  if (raw.includes('•')) {
    const [left, right] = raw.split('•').map((part) => part.trim());
    return {
      name: left || 'My Restaurant',
      address: right || '142 Market Street, Floor 1',
    };
  }
  return { name: raw, address: '142 Market Street, Floor 1' };
}

function extractMissingColumnFromError(error: unknown): string | null {
  const msg = String((error as { message?: string } | null)?.message ?? '');
  const match = /column\s+"([^"]+)"\s+of relation\s+"app_design_settings"\s+does not exist/i.exec(msg);
  return match?.[1] ?? null;
}

async function safeUpdateDesignSettingsRow(id: string, payload: Record<string, unknown>) {
  const nextPayload = { ...payload };
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from('app_design_settings')
      .update({
        ...nextPayload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (!error) return data;

    const missingColumn = extractMissingColumnFromError(error);
    if (!missingColumn || !(missingColumn in nextPayload)) {
      throw error;
    }
    delete nextPayload[missingColumn];
  }
  throw new Error('Failed to update design settings');
}

async function safeInsertDesignSettingsRow(payload: Record<string, unknown>) {
  const nextPayload = { ...payload };
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from('app_design_settings')
      .insert(nextPayload)
      .select('*')
      .single();

    if (!error) return data;

    const missingColumn = extractMissingColumnFromError(error);
    if (!missingColumn || !(missingColumn in nextPayload)) {
      throw error;
    }
    delete nextPayload[missingColumn];
  }
  throw new Error('Failed to insert design settings');
}

function rowToSettings(row: Record<string, unknown>): AppDesignSettings {
  const maxQty = row.max_product_quantity != null ? Number(row.max_product_quantity) : 5;
  const fromTitle = parsePickupTitle(row.pickup_title);
  return {
    id: String(row.id),
    app_name: String(row.app_name ?? 'FastBite'),
    logo_url: row.logo_url != null ? String(row.logo_url) : null,
    hero_background_type: (row.hero_background_type as AppDesignSettings['hero_background_type']) ?? 'gradient',
    hero_gradient_from: String(row.hero_gradient_from ?? '#f97316'),
    hero_gradient_to: String(row.hero_gradient_to ?? '#ef4444'),
    hero_solid_color: String(row.hero_solid_color ?? '#f97316'),
    hero_image_url: row.hero_image_url != null ? String(row.hero_image_url) : null,
    hero_title: String(row.hero_title ?? 'РЕСТОРАН МЕНИ'),
    hero_subtitle: String(row.hero_subtitle ?? 'Порачај го твоето јадење од нашето мени'),
    primary_color: String(row.primary_color ?? '#16a34a'),
    secondary_color: String(row.secondary_color ?? '#f97316'),
    font_family: String(row.font_family ?? 'Inter'),
    button_radius: (row.button_radius as AppDesignSettings['button_radius']) ?? 'rounded-xl',
    max_product_quantity: Math.max(1, Math.min(99, Math.floor(maxQty) || 5)),
    pickup_title: row.pickup_title != null ? String(row.pickup_title) : 'Pickup from FastBite',
    pickup_location_name:
      row.pickup_location_name != null ? String(row.pickup_location_name) : fromTitle.name,
    pickup_location_address:
      row.pickup_location_address != null
        ? String(row.pickup_location_address)
        : fromTitle.address,
    pickup_timing_text: row.pickup_timing_text != null ? String(row.pickup_timing_text) : 'ASAP Pickup',
    pickup_phone: row.pickup_phone != null ? String(row.pickup_phone) : '+389 70 000 000',
    timezone:
      row.timezone != null && String(row.timezone).trim()
        ? String(row.timezone).trim()
        : 'Europe/Skopje',
    social_facebook_url:
      row.social_facebook_url != null && String(row.social_facebook_url).trim()
        ? String(row.social_facebook_url).trim()
        : null,
    social_instagram_url:
      row.social_instagram_url != null && String(row.social_instagram_url).trim()
        ? String(row.social_instagram_url).trim()
        : null,
    updated_at: String(row.updated_at),
  };
}

/** Load global app design settings (single storefront). */
export function useDesignSettings() {
  const { isDemo } = useAuth();
  const demoMode = useDemoModeOptional();

  const query = useQuery({
    queryKey: [...DESIGN_SETTINGS_QUERY_KEY],
    enabled: true,
    queryFn: async (): Promise<AppDesignSettings | null> => {
      // 1) Try to load existing settings row.
      const { data, error } = await supabase
        .from('app_design_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) return rowToSettings(data as Record<string, unknown>);

      // 2) No settings exist yet; create a default global row.
      const { data: inserted, error: insertError } = await supabase
        .from('app_design_settings')
        .insert({} as any)
        .select('*')
        .maybeSingle();

      if (insertError) throw insertError;
      if (!inserted) return null;

      return rowToSettings(inserted as Record<string, unknown>);
    },
    staleTime: 60 * 1000,
  });

  const data = isDemo && demoMode && query.data
    ? demoMode.mergeDesignSettingsWithDemo(query.data)
    : query.data;

  return { ...query, data };
}

export type DesignSettingsUpdate = Partial<
  Omit<AppDesignSettings, 'id' | 'updated_at'>
>;

export function useUpdateDesignSettings() {
  const queryClient = useQueryClient();
  const { isDemo } = useAuth();
  const demoMode = useDemoModeOptional();

  return useMutation({
    mutationFn: async (payload: DesignSettingsUpdate) => {
      if (isDemo && demoMode) {
        return demoMode.updateDemoDesignSettings(payload);
      }

      const pickupName =
        payload.pickup_location_name != null ? String(payload.pickup_location_name).trim() : '';
      const pickupAddress =
        payload.pickup_location_address != null
          ? String(payload.pickup_location_address).trim()
          : '';
      const pickupTitleCombined =
        pickupName || pickupAddress
          ? `${pickupName || 'My Restaurant'} • ${pickupAddress || '142 Market Street, Floor 1'}`
          : undefined;

      const { data, error } = await supabase
        .from('app_design_settings')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data?.id) {
        const inserted = await safeInsertDesignSettingsRow({
          app_name: payload.app_name ?? 'FastBite',
          logo_url: payload.logo_url ?? null,
          hero_background_type: payload.hero_background_type ?? 'gradient',
          hero_gradient_from: payload.hero_gradient_from ?? '#f97316',
          hero_gradient_to: payload.hero_gradient_to ?? '#ef4444',
          hero_solid_color: payload.hero_solid_color ?? '#f97316',
          hero_image_url: payload.hero_image_url ?? null,
          hero_title: payload.hero_title ?? 'РЕСТОРАН МЕНИ',
          hero_subtitle: payload.hero_subtitle ?? 'Порачај го твоето јадење од нашето мени',
          primary_color: payload.primary_color ?? '#16a34a',
          secondary_color: payload.secondary_color ?? '#f97316',
          font_family: payload.font_family ?? 'Inter',
          button_radius: payload.button_radius ?? 'rounded-xl',
          max_product_quantity: payload.max_product_quantity ?? 5,
          pickup_title: pickupTitleCombined ?? payload.pickup_title ?? 'Pickup from FastBite',
          pickup_location_name: payload.pickup_location_name ?? 'My Restaurant',
          pickup_location_address:
            payload.pickup_location_address ?? '142 Market Street, Floor 1',
          pickup_timing_text: payload.pickup_timing_text ?? 'ASAP Pickup',
          pickup_phone: payload.pickup_phone ?? '+389 70 000 000',
          social_facebook_url: payload.social_facebook_url ?? null,
          social_instagram_url: payload.social_instagram_url ?? null,
        });
        return rowToSettings(inserted as Record<string, unknown>);
      }

      const updated = await safeUpdateDesignSettingsRow(data.id, {
        ...payload,
        ...(pickupTitleCombined ? { pickup_title: pickupTitleCombined } : {}),
      });
      return rowToSettings(updated as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DESIGN_SETTINGS_QUERY_KEY });
    },
  });
}
