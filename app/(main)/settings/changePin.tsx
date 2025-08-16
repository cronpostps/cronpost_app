// app/(main)/settings/changePin.tsx

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

export default function ChangePinScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const router = useRouter();
  const { user } = useAuth(); 
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinQuestion, setPinQuestion] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.pin_code_question) {
      setPinQuestion(user.pin_code_question);
    }
  }, [user]);
  
  const handleSave = async () => {
      if (newPin.length !== 4 || currentPin.length !== 4) {
          Toast.show({ type: 'error', text1: t('errors.title_error'), text2: t('create_pin_page.error_pin_format') });
          return;
      }
      if (newPin !== confirmPin) {
          Toast.show({ type: 'error', text1: t('errors.title_error'), text2: t('create_pin_page.error_pin_mismatch') });
          return;
      }

      setIsSaving(true);
      try {
          await api.post('/api/users/change-pin', {
              current_pin: currentPin,
              new_pin: newPin,
              pin_question: pinQuestion,
          });
          Toast.show({
              type: 'success',
              text1: t('change_pin_page.success_pin_updated'),
              onHide: () => router.back(),
          });
      } catch (error) {
          Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
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
    button: { backgroundColor: themeColors.tint, padding: 15, borderRadius: 8, alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('change_pin_page.current_pin_label')}</Text>
          <TextInput style={styles.input} value={currentPin} onChangeText={setCurrentPin} keyboardType="number-pad" maxLength={4} secureTextEntry />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('change_pin_page.new_pin_label')}</Text>
          <TextInput style={styles.input} value={newPin} onChangeText={setNewPin} keyboardType="number-pad" maxLength={4} secureTextEntry />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('change_pin_page.confirm_pin_label')}</Text>
          <TextInput style={styles.input} value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" maxLength={4} secureTextEntry />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('change_pin_page.pin_question_label')}</Text>
          <TextInput style={styles.input} value={pinQuestion} onChangeText={setPinQuestion} />
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('change_pin_page.btn_update_pin')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}