import React from 'react';
import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          title: 'Dashboard',
          headerShown: true, // We can show a header here
        }} 
      />
    </Stack>
  );
}