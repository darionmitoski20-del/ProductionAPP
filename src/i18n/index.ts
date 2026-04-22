import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import mk from '@/locales/mk';
import en from '@/locales/en';

export const FASTBITE_LANG_STORAGE_KEY = 'fastbite_i18nextLng';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      mk: { translation: mk },
      en: { translation: en },
    },
    fallbackLng: 'mk',
    supportedLngs: ['mk', 'en'],
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: FASTBITE_LANG_STORAGE_KEY,
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    defaultNS: 'translation',
  });

function applyDocumentLang(lng: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lng === 'mk' || lng.startsWith('mk') ? 'mk' : 'en';
}

applyDocumentLang(i18n.language);
i18n.on('languageChanged', (lng) => {
  applyDocumentLang(lng);
});

export default i18n;
