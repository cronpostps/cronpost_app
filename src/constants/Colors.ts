// src/constants/Colors.ts
// Version: 1.1.0

const tintColorLight = '#d96c00'; // Brand color for light theme from style.css
const tintColorDark = '#ffa500';  // Brand color for dark theme from style.css

export const Colors = {
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
  },
};
