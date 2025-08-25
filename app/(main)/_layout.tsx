// app/(main)/_layout.tsx
// version 1.0.0

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Colors } from '../../src/constants/Colors';
// import { useRouter } from 'expo-router';
// import { useAuth } from '../../src/store/AuthContext';
import { useTheme } from '../../src/store/ThemeContext';
import { useIamStore } from '../../src/store/iamStore';

export default function MainTabLayout() {
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const { t } = useTranslation();
  const { unreadCount } = useIamStore();
  // const { user } = useAuth();
  // const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColors.tint,
        tabBarInactiveTintColor: themeColors.icon,
        tabBarStyle: {
          backgroundColor: themeColors.card,
          borderTopColor: themeColors.inputBorder,
          // height: 50,
          paddingBottom: 1,
          paddingTop: 1,
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
      />
      <Tabs.Screen
        name="iam"
        options={{
          title: t('tabs.iam'),
          // --- 3. BẮT ĐẦU THÊM ---
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          // --- KẾT THÚC THÊM ---
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