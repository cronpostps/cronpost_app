    // app/_layout.tsx
    // Version: 1.2.0
    
    import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { Colors } from '../src/constants/Colors';
import { AuthProvider, useAuth } from '../src/store/AuthContext';
    
    // Import and initialize i18next
    import '../src/locales/i18n';
    
    const InitialLayout = () => {
      const { isAuthenticated, isLoading } = useAuth();
      const segments = useSegments();
      const router = useRouter();
      const colorScheme = useColorScheme();
      const themeColors = Colors[colorScheme ?? 'light'];
    
      const segmentsStr = segments.join('/');
    
      useEffect(() => {
        if (isLoading) return;
    
        const inAuthGroup = segments[0] === '(main)';
    
        if (isAuthenticated && !inAuthGroup) {
          router.replace('/(main)/dashboard');
        } else if (!isAuthenticated && inAuthGroup) {
          router.replace('/');
        }
      }, [isAuthenticated, isLoading, segmentsStr]);
    
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
          {/* === ADD THIS LINE === */}
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="(main)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      );
    };
    
    export default function RootLayout() {
      return (
        <AuthProvider>
          <InitialLayout />
        </AuthProvider>
      );
    }
    