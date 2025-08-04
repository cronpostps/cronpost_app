// app/(main)/settings/checkinOptions.tsx
// Version 1.1.0 (Refactored with live updates)

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

export default function CheckinOptionsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const themeColors = Colors[theme];
  const isPremium = user?.membership_type === 'premium';

  const [isLoading, setIsLoading] = useState(true);

  // State cho từng tùy chọn
  const [settings, setSettings] = useState({
    checkinOnSignin: false,
    useCheckinToken: false,
    sendReminder: false,
    reminderMinutes: '5',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/api/users/checkin-settings');
        const data = response.data;
        setSettings({
          checkinOnSignin: data.checkin_on_signin,
          useCheckinToken: data.use_checkin_token_email,
          sendReminder: data.send_additional_reminder,
          reminderMinutes: data.additional_reminder_minutes?.toString() || '5',
        });
      } catch (error) {
        console.error("Failed to fetch check-in settings", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Hàm cập nhật cài đặt chung
  const handleSettingUpdate = async (update: Partial<typeof settings>) => {
    const originalSettings = { ...settings };
    const newSettings = { ...settings, ...update };
    setSettings(newSettings); // Cập nhật UI trước

    try {
      const payload = {
        checkin_on_signin: newSettings.checkinOnSignin,
        use_checkin_token_email: newSettings.useCheckinToken,
        send_additional_reminder: newSettings.sendReminder,
        additional_reminder_minutes: parseInt(newSettings.reminderMinutes, 10) || 5,
      };
      await api.put('/api/users/checkin-settings', payload);
      Alert.alert(t('security_page.biometrics_success_title'), t('checkin_options_page.success_saved'));
    } catch (error) {
      Alert.alert(t('errors.generic', { message: '' }), translateApiError(error));
      setSettings(originalSettings); // Hoàn tác lại nếu có lỗi
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    scrollContainer: { paddingVertical: 20 },
    itemContainer: { paddingHorizontal: 20, backgroundColor: themeColors.inputBackground, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: themeColors.inputBorder, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder },
    switchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    itemTextContainer: { flex: 1, marginRight: 10 },
    itemLabel: { fontSize: 16, color: themeColors.text },
    itemDescription: { fontSize: 12, color: themeColors.icon, marginTop: 2 },
    minutesInputContainer: { paddingBottom: 15 },
    minutesInput: { height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text, backgroundColor: themeColors.background, marginTop: 8 },
    disabledOverlay: { opacity: 0.5 },
  });

  if (isLoading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.itemContainer}>
          <View style={styles.switchItem}>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>{t('checkin_options_page.checkin_on_signin_label')}</Text>
              <Text style={styles.itemDescription}>{t('checkin_options_page.checkin_on_signin_desc')}</Text>
            </View>
            <Switch 
              value={settings.checkinOnSignin} 
              onValueChange={(value) => handleSettingUpdate({ checkinOnSignin: value })} 
              trackColor={{ false: themeColors.inputBorder, true: themeColors.tint }} 
              thumbColor={'#ffffff'} 
            />
          </View>
        </View>

        <View style={[styles.itemContainer, { marginTop: 30 }]}>
          <View style={styles.switchItem}>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>{t('checkin_options_page.one_click_email_label')}</Text>
              <Text style={styles.itemDescription}>{t('checkin_options_page.one_click_email_desc')}</Text>
            </View>
            <Switch 
              value={settings.useCheckinToken} 
              onValueChange={(value) => handleSettingUpdate({ useCheckinToken: value })}
              trackColor={{ false: themeColors.inputBorder, true: themeColors.tint }} 
              thumbColor={'#ffffff'} 
            />
          </View>
        </View>

        <View style={[styles.itemContainer, { marginTop: 30 }]}>
          <View style={[styles.switchItem, !isPremium && styles.disabledOverlay]}>
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemLabel}>{t('checkin_options_page.additional_reminder_label')}</Text>
              <Text style={styles.itemDescription}>{t('checkin_options_page.additional_reminder_desc')}</Text>
            </View>
            <Switch 
              value={settings.sendReminder} 
              onValueChange={(value) => handleSettingUpdate({ sendReminder: value })}
              trackColor={{ false: themeColors.inputBorder, true: themeColors.tint }} 
              thumbColor={'#ffffff'}
              disabled={!isPremium}
            />
          </View>
          {settings.sendReminder && (
            <View style={[styles.minutesInputContainer, !isPremium && styles.disabledOverlay]}>
              <Text style={styles.itemLabel}>{t('checkin_options_page.additional_reminder_minutes_label')}</Text>
              <TextInput 
                style={styles.minutesInput} 
                value={settings.reminderMinutes} 
                onChangeText={(value) => setSettings(s => ({ ...s, reminderMinutes: value }))} 
                onBlur={() => handleSettingUpdate({ reminderMinutes: settings.reminderMinutes })}
                keyboardType="number-pad" 
                editable={isPremium}
              />
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}