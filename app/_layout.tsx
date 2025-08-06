// app/_layout.tsx
// Version: 1.4.0

import messaging from '@react-native-firebase/messaging';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Colors } from '../src/constants/Colors';
import '../src/locales/i18n';
import { AuthProvider, useAuth } from '../src/store/AuthContext';
import { ThemeProvider, useTheme } from '../src/store/ThemeContext';

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
  // ----- BẮT ĐẦU CẬP NHẬT -----
  const router = useRouter();

  useEffect(() => {
    // Lắng nghe sự kiện khi người dùng nhấn vào thông báo (app đang chạy nền)
    const unsubscribeFromOpen = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(
        'Notification caused app to open from background state:',
        remoteMessage,
      );
      const { thread_id } = remoteMessage.data || {};
      if (thread_id) {
        // TODO: Mở comment khi luồng IAM đã được triển khai
        // router.push(`/(main)/iam/thread/${thread_id}`);
      }
    });

    // Kiểm tra nếu app được mở từ trạng thái tắt bằng một thông báo
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            'Notification caused app to open from quit state:',
            remoteMessage,
          );
          const { thread_id } = remoteMessage.data || {};
          if (thread_id) {
            // TODO: Mở comment khi luồng IAM đã được triển khai
            // router.push(`/(main)/iam/thread/${thread_id}`);
          }
        }
      });

    // Lắng nghe sự kiện khi có thông báo đến lúc app đang mở
    const unsubscribeFromForeground = messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived in foreground!', remoteMessage);
    });

    return () => {
      unsubscribeFromOpen();
      unsubscribeFromForeground();
    };
  }, []);
  // ----- KẾT THÚC CẬP NHẬT -----
  return (
    <ThemeProvider>
      <AuthProvider>
        <InitialLayout />
        <Toast />
      </AuthProvider>
    </ThemeProvider>
  );
}
