// app/(main)/settings/notifications.tsx
// Version: 1.4.0 - Add loading state for robust toggle

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Colors } from '../../../src/constants/Colors';
import {
  registerForPushNotificationsAsync,
  unregisterFromPushNotificationsAsync,
} from '../../../src/services/notificationService';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

export default function NotificationsSettingsScreen() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { theme } = useTheme();
  const themeColors = Colors[theme];

  const [isEnabled, setIsEnabled] = useState(!!user?.notifications_enabled);
  const [isToggling, setIsToggling] = useState(false); // Thêm trạng thái loading

  useEffect(() => {
    if (user) {
      setIsEnabled(!!user.notifications_enabled);
    }
  }, [user]);

  const toggleSwitch = async () => {
    if (isToggling) return; // Ngăn người dùng nhấn liên tục
    
    setIsToggling(true);
    const newState = !isEnabled;

    try {
      if (newState) {
        await registerForPushNotificationsAsync();
      } else {
        await unregisterFromPushNotificationsAsync();
      }
      await refreshUser();
    } catch (error) {
      Alert.alert(
        t('errors.title_error'), 
        translateApiError(error)
      );
    } finally {
      setIsToggling(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
      padding: 20,
    },
    settingItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 15,
      backgroundColor: themeColors.inputBackground,
      paddingHorizontal: 20,
      borderRadius: 10,
    },
    label: {
      fontSize: 16,
      color: themeColors.text,
    },
    // Thêm style cho spinner
    activityIndicator: {
      transform: [{ scale: 0.8 }],
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.settingItem}>
        <Text style={styles.label}>{t('settings_page.enable_push_notifications')}</Text>
        {isToggling ? (
          <ActivityIndicator style={styles.activityIndicator} color={themeColors.tint} />
        ) : (
          <Switch
            trackColor={{ false: '#767577', true: themeColors.tint }}
            thumbColor={isEnabled ? '#f4f3f4' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleSwitch}
            value={isEnabled}
          />
        )}
      </View>
    </View>
  );
}