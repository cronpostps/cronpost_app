// app/(main)/settings/index.tsx
// Version: 1.4.0

import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';

type SettingItem = {
  id: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isDestructive?: boolean;
};

type SettingsSection = {
  title: string;
  data: SettingItem[];
};

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const themeColors = Colors[theme];
  const tabBarHeight = useBottomTabBarHeight();

  const [screenUser, setScreenUser] = useState(user);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/api/users/me');
        setScreenUser(response.data);
      } catch (error) {
        console.error(
          'Failed to fetch latest user data for settings screen',
          error
        );
        setScreenUser(user); // Fallback to context user on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [user]);

  const handleSignOut = () => {
    Alert.alert(
      t('settings_page.sign_out_confirm_title'),
      t('settings_page.sign_out_confirm_body'),
      [
        { text: t('settings_page.btn_cancel'), style: 'cancel' },
        {
          text: t('settings_page.btn_confirm'),
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const handleLanguageChange = () => {
    const nextLang = i18n.language === 'en' ? 'vi' : 'en';
    i18n.changeLanguage(nextLang);
  };

  const handleRateApp = () => {
    const storeUrl =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/your-app-id'
        : 'market://details?id=your.package.name';
    Linking.canOpenURL(storeUrl).then((supported) => {
      if (supported) {
        Linking.openURL(storeUrl);
      } else {
        Alert.alert('Error', 'Could not open the store link.');
      }
    });
  };

  const sections: SettingsSection[] = [
    {
      title: t('settings_page.group_account'),
      data: [
        {
          id: 'profile',
          label: t('settings_page.item_profile_and_usage'),
          description: t('settings_page.item_profile_and_usage_desc'),
          icon: 'person-circle-outline',
          onPress: () => router.push('/settings/profile'),
        },
        {
          id: 'contacts',
          label: t('settings_page.item_contacts'),
          description: t('settings_page.item_contacts_desc'),
          icon: 'people-outline',
          onPress: () => router.push('/settings/contacts'),
        },
        {
          id: 'smtp',
          label: t('settings_page.item_smtp'),
          description: t('settings_page.item_smtp_desc'),
          icon: 'mail-outline',
          onPress: () => router.push('/settings/smtp'),
        },
        {
          id: 'notifications',
          label: t('settings_page.item_notifications'),
          description: t('settings_page.item_notifications_desc'),
          icon: 'notifications-outline',
          onPress: () => router.push('/settings/notifications'),
        },
      ],
    },
    {
      title: t('settings_page.group_security'),
      data: [
        {
          id: 'password',
          label: t('settings_page.item_password'),
          description: t('settings_page.item_password_desc'),
          icon: 'lock-closed-outline',
          onPress: () => router.push('/settings/changePassword'),
        },
        {
          id: 'pin',
          label: t('settings_page.item_pin'),
          description: t('settings_page.item_pin_desc'),
          icon: 'keypad-outline',
          onPress: () => router.push('/settings/security'),
        },
        {
          id: 'login_history',
          label: t('settings_page.item_login_history'),
          description: t('settings_page.item_login_history_desc'),
          icon: 'shield-outline',
          onPress: () => router.push('/settings/loginHistory'),
        },
        {
          id: 'checkin',
          label: t('settings_page.item_checkin'),
          description: t('settings_page.item_checkin_desc'),
          icon: 'timer-outline',
          onPress: () => router.push('/settings/checkinOptions'),
        },
        {
          id: 'verifier',
          label: t('settings_page.item_verifier'),
          description: t('settings_page.item_verifier_desc'),
          icon: 'shield-checkmark-outline',
          onPress: () => {
            if (user?.membership_type === 'premium') {
              router.push('/settings/trustVerifier');
            } else {
              Alert.alert(
                t('header.modal_upgrade_title'),
                t('errors.ERR_AUTH_PREMIUM_REQUIRED')
              );
            }
          },
        },
      ],
    },
    {
      title: t('settings_page.group_data'),
      data: [
        {
          id: 'files',
          label: t('settings_page.item_files'),
          description: t('settings_page.item_files_desc'),
          icon: 'folder-open-outline',
          onPress: () => {
            if (user?.membership_type === 'premium') {
              router.push('/settings/files');
            } else {
              Alert.alert(
                t('header.modal_upgrade_title'),
                t('errors.ERR_AUTH_PREMIUM_REQUIRED')
              );
            }
          },
        },
        {
          id: 'quotes',
          label: t('settings_page.item_quotes'),
          description: t('settings_page.item_quotes_desc'),
          icon: 'chatbox-ellipses-outline',
          onPress: () => router.push('/settings/quotes'),
        },
        {
          id: 'sending_history',
          label: t('settings_page.item_sending_history'),
          description: t('settings_page.item_sending_history_desc'),
          icon: 'archive-outline',
          onPress: () => router.push('/settings/sendingHistory'),
        },
      ],
    },
    {
      title: t('settings_page.group_app'),
      data: [
        {
          id: 'rate',
          label: t('settings_page.item_rate'),
          description: t('settings_page.item_rate_desc'),
          icon: 'star-outline',
          onPress: handleRateApp,
        },
        {
          id: 'terms',
          label: t('settings_page.item_terms'),
          description: t('settings_page.item_terms_desc'),
          icon: 'document-text-outline',
          onPress: () => router.push('/settings/terms'),
        },
        {
          id: 'privacy',
          label: t('settings_page.item_privacy'),
          description: t('settings_page.item_privacy_desc'),
          icon: 'eye-outline',
          onPress: () => router.push('/settings/privacy'),
        },
        {
          id: 'faqs',
          label: t('settings_page.item_faqs'),
          description: t('settings_page.item_faqs_desc'),
          icon: 'help-circle-outline',
          onPress: () => router.push('/settings/faqs'),
        },
      ],
    },
  ];

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: themeColors.background,
    },
    sectionHeader: {
      fontSize: 14,
      fontWeight: 'bold',
      color: themeColors.icon,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
      textTransform: 'uppercase',
    },
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      backgroundColor: themeColors.inputBackground,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: themeColors.inputBorder,
    },
    itemIcon: { marginRight: 20 },
    itemTextContainer: { flex: 1 },
    itemLabel: { fontSize: 16, color: themeColors.text },
    itemDescription: { fontSize: 12, color: themeColors.icon, marginTop: 2 },
    chevronIcon: { marginLeft: 10 },
    footer: { padding: 20, alignItems: 'center' },
    signOutButton: {
      backgroundColor: '#dc3545',
      paddingVertical: 15,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
      marginBottom: 20,
    },
    signOutButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
    settingsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingButton: { flexDirection: 'row', alignItems: 'center', padding: 10 },
    settingText: { marginLeft: 8, color: themeColors.text, fontSize: 16 },
    upgradeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.tint,
      padding: 15,
      borderRadius: 8,
      margin: 20,
    },
    upgradeTextContainer: { flex: 1, marginLeft: 15 },
    upgradeTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: themeColors.buttonText,
    },
    upgradeDescription: {
      fontSize: 12,
      color: themeColors.buttonText,
      opacity: 0.9,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
        showsVerticalScrollIndicator={false}>
        {screenUser?.membership_type !== 'premium' && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => router.push('/settings/pricing')}>
            <Ionicons name="star" size={24} color={themeColors.buttonText} />
            <View style={styles.upgradeTextContainer}>
              <Text style={styles.upgradeTitle}>
                {t('settings_page.upgrade_premium_title')}
              </Text>
              <Text style={styles.upgradeDescription}>
                {t('settings_page.upgrade_premium_desc')}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={themeColors.buttonText}
            />
          </TouchableOpacity>
        )}
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            {section.data.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                onPress={item.onPress}
                style={[
                  styles.itemContainer,
                  index === 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: themeColors.inputBorder,
                  },
                ]}>
                <Ionicons
                  name={item.icon}
                  size={24}
                  color={themeColors.tint}
                  style={styles.itemIcon}
                />
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemDescription}>
                    {item.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={themeColors.icon}
                  style={styles.chevronIcon}
                />
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>
              {t('settings_page.sign_out')}
            </Text>
          </TouchableOpacity>
          <View style={styles.settingsContainer}>
            <TouchableOpacity
              style={styles.settingButton}
              onPress={handleLanguageChange}>
              <Ionicons name="globe-outline" size={20} color={themeColors.text} />
              <Text style={styles.settingText}>
                {i18n.language.toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingButton}
              onPress={toggleTheme}>
              <Ionicons
                name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color={themeColors.text}
              />
              <Text style={styles.settingText}>
                {t(theme === 'dark' ? 'themes.light' : 'themes.dark')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}