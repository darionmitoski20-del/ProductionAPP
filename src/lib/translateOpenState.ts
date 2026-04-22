import type { TFunction } from 'i18next';
import type { RestaurantStatusI18n } from '@/types';

/** Turn structured open-state payload into a user-visible string (current UI language). */
export function translateOpenStateStatus(i18n: RestaurantStatusI18n, t: TFunction): string {
  switch (i18n.key) {
    case 'hours.openNow':
      return t('hours.openNow');
    case 'hours.closedToday':
      return t('hours.closedToday');
    case 'hours.closedForToday':
      return t('hours.closedForToday');
    case 'hours.closedOpensAt':
      return t('hours.closedOpensAt', { time: i18n.time });
    case 'hours.closedOpensLaterAt':
      return t('hours.closedOpensLaterAt', {
        day: t(`hours.weekdays.${i18n.dayKey}`),
        time: i18n.time,
      });
    case 'hours.onBreakResumes':
      return t('hours.onBreakResumes', { time: i18n.time });
    default:
      return t('hours.closedToday');
  }
}
