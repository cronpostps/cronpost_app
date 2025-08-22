// app/(main)/settings/changePassword.tsx
// Version: 1.1.0

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = async () => {
    if (newPassword.length < 6 || newPassword.length > 20) {
      Toast.show({
        type: 'error',
        text1: t('errors.title_error'),
        text2: t('change_password_page.password_note'),
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: t('errors.title_error'),
        text2: t('change_password_page.error_mismatch'),
      });
      return;
    }
    
    setIsSaving(true);
    try {
      await api.put('/api/users/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      Toast.show({
        type: 'success',
        text1: t('change_password_page.success_message'),
        onHide: () => router.back(),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.title_error'),
        text2: translateApiError(error),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    scrollContainer: { padding: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 16, color: themeColors.text, marginBottom: 8 },
    input: { height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text, backgroundColor: themeColors.inputBackground },
    note: { fontSize: 12, color: themeColors.icon, marginTop: 4 },
    switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    button: { backgroundColor: themeColors.tint, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('change_password_page.current_password_label')}</Text>
          <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry={!showPasswords} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('change_password_page.new_password_label')}</Text>
          <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showPasswords} />
          <Text style={styles.note}>{t('change_password_page.password_note')}</Text>
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('change_password_page.confirm_password_label')}</Text>
          <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPasswords} />
        </View>
        
        <View style={styles.switchContainer}>
            <Text style={styles.label}>{t('signup_page.show_passwords')}</Text>
            <Switch value={showPasswords} onValueChange={setShowPasswords} trackColor={{ false: themeColors.inputBorder, true: themeColors.tint }} thumbColor={'#ffffff'}/>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('change_password_page.btn_update')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}