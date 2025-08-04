// app/(main)/settings/trustVerifier.tsx

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
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
      setVerifierEmail(user.trust_verifier_email || '');
      setIsLoading(false);
    }
  }, [user]);

  const validateEmail = (email: string) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSave = async () => {
    if (verifierEmail && !validateEmail(verifierEmail)) {
      Alert.alert(t('errors.generic', { message: '' }), t('trust_verifier_page.error_invalid_email'));
      return;
    }

    setIsSaving(true);
    try {
      // API yêu cầu gửi lại các trường khác trong profile, ta lấy từ user context
      const payload = {
        user_name: user.user_name,
        timezone: user.timezone,
        trust_verifier_email: verifierEmail || null, // Gửi null nếu chuỗi rỗng
      };
      await api.put('/api/users/profile', payload);
      await refreshUser(); // Cập nhật lại user context
      Alert.alert(t('security_page.biometrics_success_title'), t('trust_verifier_page.success_saved'));
      router.back();
    } catch (error) {
      Alert.alert(t('errors.generic', { message: '' }), translateApiError(error));
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