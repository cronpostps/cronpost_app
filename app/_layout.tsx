// app/_layout.tsx
// Version: 1.3.0

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
  }, [isAuthenticated, isLoading, segments]);

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
  // const router = useRouter();

  // // ----- BẮT ĐẦU CẬP NHẬT -----
  // useEffect(() => {
  //   // Listener này được kích hoạt khi người dùng NHẤN vào thông báo
  //   const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
  //     console.log('Notification tapped:', response);
  //     // Lấy dữ liệu đính kèm từ backend
  //     const data = response.notification.request.content.data;
      
  //     if (data && data.thread_id) {
  //       // Điều hướng đến màn hình chat của thread tương ứng
  //       router.push(`/(main)/iam/thread/${data.thread_id}`);
  //     }
  //   });

  //   return () => {
  //     // Dọn dẹp listener khi component unmount
  //     Notifications.removeNotificationSubscription(responseListener);
  //   };
  // }, []);
  // // ----- KẾT THÚC CẬP NHẬT -----
  return (
    <ThemeProvider>
      <AuthProvider>
        <InitialLayout />
        <Toast />
      </AuthProvider>
    </ThemeProvider>
  );
}
