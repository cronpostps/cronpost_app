// src/constants/Colors.ts
// Version: 1.2.0 (Added card property and explicit type)

const tintColorLight = '#d96c00'; // Brand color for light theme from style.css
const tintColorDark = '#ffa500';  // Brand color for dark theme from style.css

// --- BẮT ĐẦU CẬP NHẬT ---

// 1. Định nghĩa một Type rõ ràng cho bộ màu sắc
// Điều này sẽ giúp TypeScript bắt lỗi và tự động gợi ý code tốt hơn
export type Theme = {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  inputBackground: string;
  inputBorder: string;
  buttonBackground: string;
  buttonText: string;
  card: string;
  primary: string;
  textSecondary: string;
  border: string;
};

// 2. Áp dụng Type đã định nghĩa và thêm giá trị cho 'card'
export const Colors: { light: Theme; dark: Theme } = {
  light: {
    text: '#1c1c1c',
    background: '#f0f0f0',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    inputBackground: '#ffffff',
    inputBorder: '#cccccc',
    buttonBackground: '#007bff',
    buttonText: '#ffffff',
    card: '#ffffff',
    primary: tintColorLight,
    textSecondary: '#6c757d',
    border: '#dee2e6',
  },
  dark: {
    text: '#e0e0e0',
    background: '#121212',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    inputBackground: '#2b3035',
    inputBorder: '#495057',
    buttonBackground: '#007bff',
    buttonText: '#ffffff',
    card: '#2b3035',
    primary: tintColorDark,
    textSecondary: '#adb5bd',
    border: '#495057',
  },
};

// --- KẾT THÚC CẬP NHẬT ---