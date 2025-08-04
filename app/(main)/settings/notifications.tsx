// app/(main)/settings/notifications.tsx
// Version: 1.1.0 - Applied i18n

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Colors } from '../../../src/constants/Colors';
import {
  registerForPushNotificationsAsync,
  unregisterFromPushNotificationsAsync,
} from '../../../src/services/notificationService';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';

export default function NotificationsSettingsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const themeColors = Colors[theme];

  const [isEnabled, setIsEnabled] = useState(!!user?.notifications_enabled);

  const toggleSwitch = async () => {
    const newState = !isEnabled;
    setIsEnabled(newState);

    try {
      if (newState) {
        await registerForPushNotificationsAsync();
      } else {
        await unregisterFromPushNotificationsAsync();
      }
    } catch (error) {
      Alert.alert(
        t('errors.title_error'), 
        t('errors.update_notification_settings_failed')
      );
      setIsEnabled(!newState);
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
  });

  return (
    <View style={styles.container}>
      <View style={styles.settingItem}>
        <Text style={styles.label}>{t('settings_page.enable_push_notifications')}</Text>
        <Switch
          trackColor={{ false: '#767577', true: themeColors.tint }}
          thumbColor={isEnabled ? '#f4f3f4' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
          onValueChange={toggleSwitch}
          value={isEnabled}
        />
      </View>
    </View>
  );
}