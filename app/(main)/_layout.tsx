// app/(main)/_layout.tsx
// version 1.1.0

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import Toast from 'react-native-toast-message';
import { Colors } from '../../src/constants/Colors';
import { useAuth } from '../../src/store/AuthContext';
import { useTheme } from '../../src/store/ThemeContext';
import { useIamStore } from '../../src/store/iamStore';

export default function MainTabLayout() {
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const { t } = useTranslation();
  const { unreadCount } = useIamStore();
  const { user } = useAuth();

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
      safeAreaInsets={{
        bottom: 5 
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={30}
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
              size={30}
              color={color}
            />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (user?.account_status === 'FNS') {
              e.preventDefault();
              Toast.show({
                type: 'error',
                text1: t('fns_page.card_title'),
                text2: t('fns_page.p1'),
                visibilityTime: 3000,
              });
            }
          },
        }}
      />
      <Tabs.Screen
        name="iam"
        options={{
          title: t('tabs.iam'),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={30}
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
              size={30}
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
              size={30}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}