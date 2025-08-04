// app/(main)/settings/recoverPin.tsx

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

export default function RecoverPinScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const { refreshUser } = useAuth();
  const router = useRouter();

  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (newPin.length !== 4) {
      Alert.alert(t('errors.generic', {message: ''}), t('create_pin_page.error_pin_format'));
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert(t('errors.generic', {message: ''}), t('create_pin_page.error_pin_mismatch'));
      return;
    }
    
    setIsSaving(true);
    try {
      await api.post('/api/users/recover-pin', {
        recovery_code: recoveryCode,
        new_pin: newPin,
      });
      await refreshUser();
      Alert.alert(t('security_page.biometrics_success_title'), t('recover_pin_page.success_pin_recovered'));
      router.back();
    } catch (error) {
      Alert.alert(t('errors.generic', {message: ''}), translateApiError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    scrollContainer: { padding: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 16, color: themeColors.text, marginBottom: 8 },
    description: { fontSize: 12, color: themeColors.icon, marginBottom: 8 },
    input: { height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text, backgroundColor: themeColors.inputBackground },
    button: { backgroundColor: themeColors.tint, padding: 15, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('recover_pin_page.recovery_code_label')}</Text>
          <Text style={styles.description}>{t('recover_pin_page.recovery_code_desc')}</Text>
          <TextInput style={styles.input} value={recoveryCode} onChangeText={setRecoveryCode} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('recover_pin_page.new_pin_label')}</Text>
          <TextInput style={styles.input} value={newPin} onChangeText={setNewPin} keyboardType="number-pad" maxLength={4} secureTextEntry />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('recover_pin_page.confirm_pin_label')}</Text>
          <TextInput style={styles.input} value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" maxLength={4} secureTextEntry />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('recover_pin_page.btn_recover_pin')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}