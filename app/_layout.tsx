// app/_layout.tsx
// Version: 1.8.0

import { Ionicons } from '@expo/vector-icons';
import messaging from '@react-native-firebase/messaging';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
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

const InitialLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  
  const themeColors = Colors[theme];

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(main)';

    if (isAuthenticated && !inAuthGroup) {
      router.replace('/(main)/dashboard');
    } else if (!isAuthenticated && inAuthGroup) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="(main)" />
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
};

export default function RootLayout() {
  const router = useRouter();
  
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    const unsubscribeFromForeground = messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived in foreground!', remoteMessage);
      Toast.show({
        type: 'info',
        text1: remoteMessage.notification?.title,
        text2: remoteMessage.notification?.body,
        onPress: () => {
          const { thread_id, message_id } = remoteMessage.data || {};
          if (thread_id && message_id) {
            router.push({
              pathname: '/(main)/iam/thread/[thread_id]',
              params: { 
                thread_id: String(thread_id),
                selected_message_id: String(message_id)
              },
            });
          }
        }
      });
      useIamStore.getState().fetchUnreadCount();
    });

    const handleNotificationNavigation = (remoteMessage: any) => {
      const { thread_id, message_id, screen } = remoteMessage.data || {};
      if (thread_id && message_id) {
        router.push({
          pathname: '/(main)/iam/thread/[thread_id]',
          params: { 
            thread_id: thread_id,
            selected_message_id: message_id 
          },
        });
      } else if (screen === 'ucm' || screen === 'dashboard') {
        router.push('/(main)/dashboard');
      }
    };

    const unsubscribeFromOpen = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      handleNotificationNavigation(remoteMessage);
    });

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage);
          setTimeout(() => handleNotificationNavigation(remoteMessage), 500);
        }
      });

    return () => {
      unsubscribeFromOpen();
      unsubscribeFromForeground();
    };
  }, [router]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const ThemedLayout = () => {
    const { theme } = useTheme();
    const themeColors = Colors[theme];
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <InitialLayout />
        <Toast />
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  };
  
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AuthProvider>
            <ThemedLayout />
          </AuthProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}