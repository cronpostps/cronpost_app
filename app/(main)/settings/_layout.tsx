// app/(main)/settings/_layout.tsx
// Version 1.2.0

import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../src/constants/Colors';
import { useTheme } from '../../../src/store/ThemeContext';

export default function SettingsStackLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.background },
        headerTintColor: themeColors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackVisible: true,
      }}>
      <Stack.Screen name="index" options={{ title: t('settings_page.title'), headerShown: false }} />
      <Stack.Screen name="security" options={{ title: t('security_page.title') }} />
      <Stack.Screen name="profile" options={{ title: t('profile_page.title') }} />
      <Stack.Screen name="sendingHistory" options={{ title: t('history_page.title') }} />
      <Stack.Screen name="createPin" options={{ title: t('create_pin_page.title') }} />
      <Stack.Screen name="changePin" options={{ title: t('change_pin_page.title') }} />
      <Stack.Screen name="recoverPin" options={{ title: t('recover_pin_page.title') }} />
      <Stack.Screen name="checkinOptions" options={{ title: t('checkin_options_page.title') }} />
      <Stack.Screen name="trustVerifier" options={{ title: t('trust_verifier_page.title') }} />
      <Stack.Screen name="changePassword" options={{ title: t('change_password_page.title') }} />
      <Stack.Screen name="loginHistory" options={{ title: t('login_history_page.title') }} />
      <Stack.Screen name="pricing" options={{ title: t('settings_page.upgrade_premium_title') }} />
      <Stack.Screen name="terms" options={{ title: t('settings_page.item_terms') }} />
      <Stack.Screen name="privacy" options={{ title: t('settings_page.item_privacy') }} />
      <Stack.Screen name="faqs" options={{ title: t('settings_page.item_faqs') }} />
      <Stack.Screen name="contacts" options={{ title: t('contacts_page.title') }} />
      <Stack.Screen name="contactPicker" options={{ title: t('contacts_page.import_title'), presentation: 'modal' }} />
      <Stack.Screen name="smtp" options={{ title: t('settings_page.item_smtp_title') }} />
      <Stack.Screen name="notifications" options={{ title: t('settings_page.item_notifications') }} />
      <Stack.Screen name="files" options={{ title: t('settings_page.item_files') }} />
      <Stack.Screen name="quotes/index" options={{ title: t('settings_page.item_quotes') }} />
      <Stack.Screen name="quotes/[folderId]" options={{ title: t('quotes_page.header') }} />
    </Stack>
  );
}