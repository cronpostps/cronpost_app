// app/_layout.tsx
// Version: 2.1.1

import { Ionicons } from '@expo/vector-icons';
import messaging from '@react-native-firebase/messaging';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Colors } from '../src/constants/Colors';
import '../src/locales/i18n';
import { AuthProvider, useAuth } from '../src/store/AuthContext';
import { ThemeProvider, useTheme } from '../src/store/ThemeContext';
import { useIamStore } from '../src/store/iamStore';

SplashScreen.preventAutoHideAsync();

declare global {
  var RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS: boolean;
}
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

function RootLayoutNav() {
  console.log("--- RootLayoutNav ĐANG RENDER ---");
  const { isAuthenticated, isLoading, isAuthProcessing } = useAuth();
  const { theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const themeColors = Colors[theme];

  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if ((!isLoading && !isAuthProcessing) && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, isAuthProcessing, fontsLoaded, fontError]);
  
  useEffect(() => {
    if (!router) return;

    const handleNotificationNavigation = (remoteMessage: any) => {
      const { thread_id, message_id, screen } = remoteMessage.data || {};
      if (thread_id && message_id) {
        router.push({
          pathname: '/(main)/iam/thread/[thread_id]',
          params: { thread_id, selected_message_id: message_id },
        });
      } else if (screen === 'ucm' || screen === 'dashboard') {
        router.push('/(main)/dashboard');
      }
    };

    const unsubscribeFromForeground = messaging().onMessage(async remoteMessage => {
      Toast.show({
        type: 'info',
        text1: remoteMessage.notification?.title,
        text2: remoteMessage.notification?.body,
        onPress: () => handleNotificationNavigation(remoteMessage),
      });
      useIamStore.getState().fetchUnreadCount();
    });

    const unsubscribeFromOpen = messaging().onNotificationOpenedApp(handleNotificationNavigation);

    messaging().getInitialNotification().then(remoteMessage => {
      if (remoteMessage) {
        setTimeout(() => handleNotificationNavigation(remoteMessage), 500);
      }
    });

    return () => {
      unsubscribeFromOpen();
      unsubscribeFromForeground();
    };
  }, [router]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isLoading || !isMounted) {
      return;
    }

    const inAuthScreens = segments[0] === '(main)';

    if (!isAuthenticated) {
      if (inAuthScreens) {
        router.replace('/');
      }
    } else {
      if (!inAuthScreens) {
        router.replace('/(main)/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, segments, router, isMounted]);

  if (isLoading || isAuthProcessing || (!fontsLoaded && !fontError)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="fns" />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="forgot-password" />
      </Stack>
      <Toast />
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

export default function RootLayout() {
  console.log("--- RootLayout ĐANG RENDER ---");
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}