// index.js

import messaging from '@react-native-firebase/messaging';
import 'expo-router/entry';

// Đăng ký handler cho các thông báo nền
// Tác vụ này phải là một tác vụ bất đồng bộ và phải được đăng ký bên ngoài
// các component React của bạn.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
});