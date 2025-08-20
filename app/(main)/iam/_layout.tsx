// app/(main)/iam/_layout.tsx
// Version: 1.1.0

import { Stack } from 'expo-router';
import React from 'react';

export default function IamLayout() {
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