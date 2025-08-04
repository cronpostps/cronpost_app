// src/store/ThemeContext.tsx
// Version: 2.0.0 (Updated with Persistence)

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

type Theme = 'light' | 'dark';
const THEME_STORAGE_KEY = 'user_theme';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemTheme = useColorScheme() ?? 'light';
  const [theme, _setTheme] = useState<Theme>(systemTheme);
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  // Hook để đọc theme đã lưu khi ứng dụng bắt đầu
  useEffect(() => {
    const loadThemeFromStorage = async () => {
      try {
        const savedTheme = (await AsyncStorage.getItem(
          THEME_STORAGE_KEY
        )) as Theme | null;
        // Nếu có theme đã lưu, dùng nó. Nếu không, dùng theme của hệ thống.
        _setTheme(savedTheme || systemTheme);
      } catch (error) {
        console.error('Failed to load theme from storage.', error);
      } finally {
        setIsThemeLoading(false);
      }
    };

    loadThemeFromStorage();
  }, [systemTheme]);

  // Hàm để thay đổi theme và lưu vào bộ nhớ
  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      _setTheme(newTheme);
    } catch (error) {
      console.error('Failed to save theme to storage.', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };
  
  // Tránh hiển thị nội dung khi theme chưa được tải xong
  if (isThemeLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};