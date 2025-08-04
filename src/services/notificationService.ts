// src/services/notificationService.ts
// Version: 1.1.0

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from '../api/api'; // Giả định bạn đã có một file cấu hình api client

/**
 * Cấu hình và đăng ký nhận push notification.
 * Hàm này sẽ hỏi quyền người dùng, lấy token và gửi lên server.
 * @returns {Promise<string|undefined>} ExpoPushToken nếu thành công, ngược lại là undefined.
 */
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  let token;

  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices.');
    return;
  }

  // --- Cài đặt cho Android ---
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  // --- Hỏi quyền người dùng ---
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('User did not grant permission for push notifications.');
    return;
  }
  
  // --- Lấy token và gửi lên server ---
  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Obtained Expo Push Token:', token);

    // Gọi API đã tạo ở Bước 1.2
    await api.post('/api/push/register', { token: token });
    console.log('Successfully registered push token with the server.');

  } catch (error) {
    console.error('Failed to get or register push token:', error);
  }

  return token;
}

/**
 * Hủy đăng ký nhận push notification.
 * Hàm này sẽ gọi API để xóa token khỏi server.
 */
export async function unregisterFromPushNotificationsAsync(): Promise<void> {
  try {
    // Gọi API đã tạo ở Bước 1.2
    await api.delete('/api/push/unregister');
    console.log('Successfully unregistered push token from the server.');
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}