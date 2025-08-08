// app/(main)/scm/_layout.tsx
// Version: 1.0.0

import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../../src/constants/Colors';
import { useTheme } from '../../../src/store/ThemeContext';

export default function ScmStackLayout() {
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
          // Ẩn header của Stack vì đã có header từ Tab Navigator
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="compose"
        options={{
          // Sẽ lấy tiêu đề từ key dịch thuật
          title: t('scm_page.header'), 
          // Hiển thị màn hình này dưới dạng modal để có trải nghiệm tốt hơn
          presentation: 'modal', 
          headerTitleAlign: 'center',
          headerShown: false,
        }}
      />
    </Stack>
  );
}