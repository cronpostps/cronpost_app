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
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'zh', name: '中文' },
  { code: 'ru', name: 'Русский' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'ja', name: '日本語' },
  { code: 'pt', name: 'Português' },
  { code: 'ar', name: 'العربية' },
  { code: 'ko', name: '한국어' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'pl', name: 'Polski' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'uk', name: 'Українська' },
  { code: 'th', name: 'ไทย' },
  { code: 'fa', name: 'فارسی' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'he', name: 'עברית' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'hi', name: 'हिन्दी' },
];