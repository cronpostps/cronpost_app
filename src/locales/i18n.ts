import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import 'dayjs/locale/zh-cn';
import * as Localization from 'expo-localization';
import i18n, { InitOptions } from 'i18next'; // <-- Sửa dòng import này
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

// --- TẠO MỘT ĐỐI TƯỢNG CẤU HÌNH CÓ KIỂU DỮ LIỆU RÕ RÀNG ---
const i18nOptions: InitOptions = {
  resources,
  lng: Localization.getLocales()[0]?.languageCode || 'en', // Thêm fallback để an toàn
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false,
  },
};
// ----------------------------------------------------
// eslint-disable-next-line import/no-named-as-default-member
i18n
  .use(initReactI18next)
  .init(i18nOptions); // <-- Truyền đối tượng đã được định kiểu vào đây

// --- Phần đồng bộ dayjs (giữ nguyên) ---
const detectedLng = i18n.language;
if (detectedLng === 'zh') {
  dayjs.locale('zh-cn');
} else {
  dayjs.locale(detectedLng);
}

i18n.on('languageChanged', (lng) => {
  if (lng === 'zh') {
    dayjs.locale('zh-cn');
  } else {
    dayjs.locale(lng);
  }
});
// ------------------------------------

export default i18n;