// src/utils/errorTranslator.ts
// Version: 1.0.0

import i18n from '../locales/i18n';

/**
 * Translates an API error object into a user-friendly string.
 * It looks for a translation key matching the error code from the backend.
 * @param error The error object received from Axios.
 * @returns A translated, user-friendly error message.
 */
export const translateApiError = (error: any): string => {
  // Default fallback message
  const fallbackMessage = i18n.t('errors.unknown');

  if (!error?.response?.data?.detail) {
    return error?.message || fallbackMessage;
  }

  const detail = error.response.data.detail;

  // If detail contains a code, try to translate it
  if (typeof detail === 'object' && detail.code) {
    // We use a namespace 'errors' which matches the structure in your en.json
    const translationKey = `errors.${detail.code}`;
    
    // Check if a translation exists for this key
    if (i18n.exists(translationKey)) {
      return i18n.t(translationKey, detail.context || {}) as string;
    } else {
      // If no translation, return the original message or code as fallback
      return detail.message || detail.code;
    }
  }

  // If detail is just a string, return it
  if (typeof detail === 'string') {
    return detail;
  }

  // Final fallback
  return fallbackMessage;
};