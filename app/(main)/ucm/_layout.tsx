// app/(main)/ucm/_layout.tsx
// Version: 1.0.1

import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../src/constants/Colors';
import { useTheme } from '../../../src/store/ThemeContext';

export default function UcmStackLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.background,
        },
        headerTintColor: themeColors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="compose"
        options={{
          title: t('ucm_page.header'), 
          presentation: 'modal', 
          headerTitleAlign: 'center',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="schedule"
        options={{
          title: t('ucm_page.header'),
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}