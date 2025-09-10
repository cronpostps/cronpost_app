// src/constants/languages.ts
// Version: 1.1.0

export type LanguageCode =
  | 'en' | 'vi' | 'zh' | 'ru' | 'es' | 'de' | 'fr' | 'ja' | 'pt' | 'ar'
  | 'ko' | 'tr' | 'pl' | 'nl' | 'uk' | 'th' | 'fa' | 'id' | 'he' | 'el'| 'hi';

export interface Language {
  code: LanguageCode;
  name: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '中文' },
  { code: 'es', name: 'Español' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ar', name: 'العربية' },
  { code: 'pt', name: 'Português' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'ko', name: '한국어' },
  { code: 'fa', name: 'فارسی' },
  { code: 'pl', name: 'Polski' },
  { code: 'uk', name: 'Українська' },
  { code: 'th', name: 'ไทย' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'he', name: 'עברית' },
  { code: 'el', name: 'Ελληνικά' },
];