import { useMemo } from 'react';
import { useBusinessHours } from '@/hooks/useBusinessHours';
import { computeOpenState, DEFAULT_TIMEZONE } from '@/lib/businessHours';
import type { RestaurantOpenState } from '@/types';
import { useDesignSettingsContext } from '@/contexts/DesignSettingsContext';

/**
 * Open/closed state for the single storefront (business hours + app timezone from design settings).
 */
export function useRestaurantOpenState(): {
  openState: RestaurantOpenState;
  isLoading: boolean;
} {
  const { data: hours = [], isLoading: hoursLoading } = useBusinessHours();
  const { settings } = useDesignSettingsContext();
  const timezone =
    settings.timezone != null && String(settings.timezone).trim()
      ? String(settings.timezone).trim()
      : DEFAULT_TIMEZONE;

  const openState = useMemo(
    () => computeOpenState(hours, timezone),
    [hours, timezone]
  );

  return {
    openState,
    isLoading: hoursLoading,
  };
}
