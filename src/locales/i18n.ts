import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import your translations
import en from './en.json';
import vi from './vi.json';
import zh from './zh.json';

const resources = {
  en: {
    translation: en,
  },
  vi: {
    translation: vi,
  },
  zh: {
    translation: zh,
  },
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: Localization.getLocales()[0].languageCode, // Detect device language
    fallbackLng: 'en', // Use English if the device language is not available
    compatibilityJSON: 'v3', // To make it work for Android
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
  });

export default i18n;