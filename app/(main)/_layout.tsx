// app/(main)/_layout.tsx
// Version: 1.1.0

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../src/constants/Colors';
import { useTheme } from '../../src/store/ThemeContext';

export default function MainTabLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColors.tint,
        tabBarInactiveTintColor: themeColors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: themeColors.background,
          borderTopColor: themeColors.inputBorder,
        },
        headerStyle: {
          backgroundColor: themeColors.background,
        },
        headerTintColor: themeColors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ucm"
        options={{
          title: t('tabs.ucm'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'paper-plane' : 'paper-plane-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="iam"
        options={{
          title: t('tabs.iam'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scm"
        options={{
          title: t('tabs.scm'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'alarm' : 'alarm-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={24} color={color} />
          ),
          headerShown: false, 
        }}
      />
    </Tabs>
  );
}
