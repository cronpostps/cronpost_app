// app/_layout.tsx
// Version: 1.5.1

import messaging from '@react-native-firebase/messaging';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { Colors } from '../src/constants/Colors';
import '../src/locales/i18n';
import { AuthProvider, useAuth } from '../src/store/AuthContext';
import { ThemeProvider, useTheme } from '../src/store/ThemeContext';
import { useIamStore } from '../src/store/iamStore';

// Silences the Firebase modular API deprecation warnings.
// This is a temporary measure until a full migration to the v22 modular API is completed.
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
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }}
      />
    </Stack>
  );
};

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Listener for foreground messages
    const unsubscribeFromForeground = messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived in foreground!', remoteMessage);

      // Hiển thị Toast thông báo
      Toast.show({
        type: 'info',
        text1: remoteMessage.notification?.title,
        text2: remoteMessage.notification?.body,
        onPress: () => {
          // Khi người dùng bấm vào Toast, điều hướng đến tin nhắn
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
      
      // Cập nhật lại số tin nhắn chưa đọc
      useIamStore.getState().fetchUnreadCount();
    });

    // Hàm xử lý điều hướng chung
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

    // Listener for notifications that opened the app from background
    const unsubscribeFromOpen = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      handleNotificationNavigation(remoteMessage);
    });

    // Check if the app was opened from a quit state by a notification
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <InitialLayout />
          <Toast />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}