// app/auth-callback.tsx

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Colors } from '../src/constants/Colors';
import { useTheme } from '../src/store/ThemeContext';

// Màn hình này chỉ hiển thị một spinner chờ ở giữa
const AuthCallbackScreen = () => {
  const { theme } = useTheme();
  const themeColors = Colors[theme];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ActivityIndicator size="large" color={themeColors.tint} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AuthCallbackScreen;