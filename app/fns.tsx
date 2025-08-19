// app/fns.tsx
// Version: 2.0.0

import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from 'react-native';

import { Colors } from '../src/constants/Colors';
import { useTheme } from '../src/store/ThemeContext';

export default function FnsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const styles = createStyles(themeColors);

  useEffect(() => {
    router.replace('/(main)/dashboard');
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (themeColors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });