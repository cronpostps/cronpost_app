// app/(main)/_layout.tsx

import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

import { Colors } from '../../src/constants/Colors';
import { useAuth } from '../../src/store/AuthContext';
import { useTheme } from '../../src/store/ThemeContext';

export default function MainTabLayout() {
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const { t } = useTranslation();

  // --- START: LOGIC MỚI ĐỂ XỬ LÝ FNS ---
  const { user } = useAuth();
  const router = useRouter();
  // --- END: LOGIC MỚI ĐỂ XỬ LÝ FNS ---

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColors.tint,
        tabBarInactiveTintColor: themeColors.icon,
        tabBarStyle: {
          backgroundColor: themeColors.card,
          borderTopColor: themeColors.inputBorder,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="ucm"
        options={{
          title: t('tabs.ucm'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={24}
              color={color}
            />
          ),
        }}
        // --- START: LOGIC MỚI ĐỂ XỬ LÝ FNS ---
        listeners={{
          tabPress: (e) => {
            // Kiểm tra trạng thái FNS
            if (user?.account_status === 'FNS') {
              // Ngăn chặn hành vi điều hướng mặc định
              e.preventDefault();
              // Điều hướng đến dashboard
              router.push('/(main)/dashboard');
              // Hiển thị thông báo Toast
              Toast.show({
                type: 'info',
                text1: t('fns_page.card_title'),
                text2: t('fns_page.p1'),
                visibilityTime: 5000,
              });
            }
          },
        }}
        // --- END: LOGIC MỚI ĐỂ XỬ LÝ FNS ---
      />
      <Tabs.Screen
        name="iam"
        options={{
          title: t('tabs.iam'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scm"
        options={{
          title: t('tabs.scm'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'timer' : 'timer-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}