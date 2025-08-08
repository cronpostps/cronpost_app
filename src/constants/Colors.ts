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
  card: string; // Thêm thuộc tính 'card'
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
    card: '#ffffff', // Thêm giá trị cho light theme (màu trắng)
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
    card: '#2b3035', // Thêm giá trị cho dark theme (dùng màu nền input)
  },
};

// --- KẾT THÚC CẬP NHẬT ---