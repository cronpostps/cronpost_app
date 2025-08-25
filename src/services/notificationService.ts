// src/services/notificationService.ts
// Version: 2.2.1

import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import api from '../api/api';

async function requestUserPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission({
      sound: true,
      alert: true,
      badge: true,
    });
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } else if (Platform.OS === 'android') {
    if (Platform.Version < 33) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return false;
}

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  const hasPermission = await requestUserPermission();
  if (!hasPermission) {
    console.log('User did not grant permission for push notifications.');
    return;
  }
  
  if (Platform.OS === 'ios') {
    await messaging().registerDeviceForRemoteMessages();
  }
  
  try {
    const token = await messaging().getToken();
    console.log('Obtained FCM Token:', token);

    if (token) {
      await api.post('/api/push/register', { token });
      console.log('Successfully registered FCM token with the server.');
      return token;
    }
  } catch (error) {
    console.error('Failed to get or register FCM token:', error);
  }
}

export async function unregisterFromPushNotificationsAsync(): Promise<void> {
  try {
    await messaging().deleteToken();
    console.log('FCM token deleted from device.');
    
    await api.delete('/api/push/unregister');
    console.log('Successfully unregistered push token from the server.');
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}