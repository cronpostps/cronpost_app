// app/_layout.tsx
// Version: 2.1.0 (FINAL)

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

// Giữ màn hình splash cho đến khi quá trình khởi tạo hoàn tất
SplashScreen.preventAutoHideAsync();

declare global {
  var RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS: boolean;
}
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

// Component nội bộ chứa tất cả logic và các hooks
function RootLayoutNav() {
  console.log("--- RootLayoutNav ĐANG RENDER ---");
  const { user, isAuthenticated, isLoading, isAuthProcessing } = useAuth();
  const { theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const themeColors = Colors[theme];

  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  // Effect để ẩn Splash Screen
  useEffect(() => {
    if ((!isLoading && !isAuthProcessing) && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, isAuthProcessing, fontsLoaded, fontError]);
  
  // Effect để xử lý thông báo đẩy (push notification)
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


  // Effect để xử lý điều hướng (navigation) dựa trên trạng thái xác thực
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isLoading || !isMounted) return;

    const inMainGroup = segments[0] === '(main)';
    const inFnsScreen = segments[0] === 'fns';

    if (isAuthenticated) {
      if (user?.account_status === 'FNS' && !inFnsScreen) {
        router.replace('/fns');
      } else if (user?.account_status !== 'FNS' && inFnsScreen) {
        router.replace('/(main)/dashboard');
      } else if (!inMainGroup && !inFnsScreen) {
        router.replace('/(main)/dashboard');
      }
    } else {
      if (inMainGroup || inFnsScreen) {
        router.replace('/');
      }
    }
  }, [user, isAuthenticated, isLoading, segments, router, isMounted]);


  // Hiển thị màn hình loading trong khi chờ xử lý
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

// Component RootLayout chính, chỉ chứa các Provider
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