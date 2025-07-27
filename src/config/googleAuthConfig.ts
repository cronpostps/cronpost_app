// src/config/googleAuthConfig.ts
// Version: 1.0.0


// *** QUAN TRỌNG: HÃY THAY THẾ CÁC GIÁ TRỊ DƯỚI ĐÂY ***
// Dán Client ID bạn đã tạo từ Google Cloud Console vào đây.
const ANDROID_CLIENT_ID = '872584544456-cfdi1ntgjqd6kcp1cldg90t996uorseh.apps.googleusercontent.com';
const IOS_CLIENT_ID = '872584544456-23n1dv06obvvi6d3h073qhjdd7r4tlov.apps.googleusercontent.com';

// Không cần chỉnh sửa phần dưới đây
export const GoogleAuthConfig = {
  androidClientId: ANDROID_CLIENT_ID,
  iosClientId: IOS_CLIENT_ID,
  // Expo Go client ID, dùng cho việc test trên ứng dụng Expo Go.
  expoClientId: '603386649315-vp4revvrcgrs45l4msdbbjsvergiqrk4.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
};
