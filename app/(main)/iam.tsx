// app/(main)/iam.tsx
// Version: 1.0.0

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function IamScreen() {
  return (
    <View style={styles.container}>
      <Text>IAM Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});