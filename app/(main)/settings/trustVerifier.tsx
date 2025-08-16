// app/(main)/settings/trustVerifier.tsx
// Version: 1.1.0 (Replaced Alerts with Toasts)

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message'; // FIX: Thêm import Toast
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

export default function TrustVerifierScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();
  const themeColors = Colors[theme];
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [verifierEmail, setVerifierEmail] = useState('');

  useEffect(() => {
    if (user) {
      // FIX: Đảm bảo user.trust_verifier_email được load chính xác
      const initialEmail = user.trust_verifier_email || '';
      setVerifierEmail(initialEmail);
      setIsLoading(false);
    }
  }, [user]);

  const validateEmail = (email: string) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSave = async () => {
    if (verifierEmail && !validateEmail(verifierEmail)) {
      // FIX: Thay thế Alert bằng Toast cho lỗi email không hợp lệ
      Toast.show({
        type: 'error',
        text1: t('errors.title_error'),
        text2: t('trust_verifier_page.error_invalid_email')
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        user_name: user?.user_name,
        timezone: user?.timezone,
        date_format: user?.date_format,
        trust_verifier_email: verifierEmail || null,
      };
      await api.put('/api/users/profile', payload);
      await refreshUser();

      // FIX: Thay thế Alert bằng Toast cho thông báo thành công
      // Dùng onHide để quay lại màn hình sau khi toast biến mất
      Toast.show({
        type: 'success',
        text1: t('trust_verifier_page.success_saved'),
        onHide: () => router.back(),
      });

    } catch (error) {
      // FIX: Thay thế Alert bằng Toast cho lỗi từ API
      Toast.show({
        type: 'error',
        text1: t('errors.title_error'),
        text2: translateApiError(error)
      });
    } finally {
      setIsSaving(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    scrollContainer: { padding: 20 },
    description: { fontSize: 14, color: themeColors.icon, marginBottom: 20, lineHeight: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 16, color: themeColors.text, marginBottom: 8 },
    input: { height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text, backgroundColor: themeColors.inputBackground },
    button: { backgroundColor: themeColors.tint, padding: 15, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  });

  if (isLoading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.description}>{t('trust_verifier_page.description')}</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('trust_verifier_page.email_label')}</Text>
          <TextInput
            style={styles.input}
            value={verifierEmail}
            onChangeText={setVerifierEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="verifier@example.com"
            placeholderTextColor={themeColors.icon}
          />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('trust_verifier_page.btn_save')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}