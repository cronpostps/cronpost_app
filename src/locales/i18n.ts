// src/locales/i18n.ts
// Version: 1.1.0

import dayjs from 'dayjs';
// Import dayjs locales cho tất cả các ngôn ngữ
import 'dayjs/locale/ar';
import 'dayjs/locale/de';
import 'dayjs/locale/el';
import 'dayjs/locale/en';
import 'dayjs/locale/es';
import 'dayjs/locale/fa';
import 'dayjs/locale/fr';
import 'dayjs/locale/he';
import 'dayjs/locale/hi';
import 'dayjs/locale/id';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import 'dayjs/locale/nl';
import 'dayjs/locale/pl';
import 'dayjs/locale/pt';
import 'dayjs/locale/ru';
import 'dayjs/locale/th';
import 'dayjs/locale/tr';
import 'dayjs/locale/uk';
import 'dayjs/locale/vi';
import 'dayjs/locale/zh-cn';

import * as Localization from 'expo-localization';
import i18n, { InitOptions } from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './ar.json';
import de from './de.json';
import el from './el.json';
import en from './en.json';
import es from './es.json';
import fa from './fa.json';
import fr from './fr.json';
import he from './he.json';
import hi from './hi.json';
import id from './id.json';
import ja from './ja.json';
import ko from './ko.json';
import nl from './nl.json';
import pl from './pl.json';
import pt from './pt.json';
import ru from './ru.json';
import th from './th.json';
import tr from './tr.json';
import uk from './uk.json';
import vi from './vi.json';
import zh from './zh.json';
const resources = {
  en: { translation: en },
  vi: { translation: vi },
  zh: { translation: zh },
  ru: { translation: ru },
  es: { translation: es },
  de: { translation: de },
  fr: { translation: fr },
  ja: { translation: ja },
  pt: { translation: pt },
  ar: { translation: ar },
  ko: { translation: ko },
  tr: { translation: tr },
  pl: { translation: pl },
  nl: { translation: nl },
  uk: { translation: uk },
  th: { translation: th },
  fa: { translation: fa },
  id: { translation: id },
  he: { translation: he },
  el: { translation: el },
  hi: { translation: hi },
};
const i18nOptions: InitOptions = {
  resources,
  lng: Localization.getLocales()[0]?.languageCode || 'en',
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false,
  },
};
// eslint-disable-next-line import/no-named-as-default-member
i18n.use(initReactI18next).init(i18nOptions);
const localeMap = {
  zh: 'zh-cn',
};
const setDayjsLocale = (lng: string) => {
  const dayjsLocale = localeMap[lng as keyof typeof localeMap] || lng;
  dayjs.locale(dayjsLocale);
};
setDayjsLocale(i18n.language);
i18n.on('languageChanged', (lng) => {
  setDayjsLocale(lng);
});

export default i18n;