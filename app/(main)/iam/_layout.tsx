// app/(main)/iam/_layout.tsx
// Version: 1.1.0

import { Stack } from 'expo-router';
import React from 'react';
import { Colors } from '../../../src/constants/Colors';
import { useTheme } from '../../../src/store/ThemeContext';

export default function IamLayout() {
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen
        name="compose"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="thread/[thread_id]" 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack>
  );
}