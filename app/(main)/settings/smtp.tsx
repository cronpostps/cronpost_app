// app/(main)/settings/smtp.tsx
// Version: 1.3.0 (Type and Hook Fixes)

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

// FIX: Định nghĩa kiểu dữ liệu cho cài đặt SMTP
interface SmtpSettings {
  smtp_server: string;
  smtp_port: number;
  smtp_sender_email: string;
  is_active: boolean;
}

const SmtpScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const themeColors = Colors[theme];

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // FIX: Cung cấp kiểu dữ liệu cho state
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings | null>(null);
  const [formState, setFormState] = useState({
    server: '',
    port: '587',
    email: '',
    password: '',
  });
  const [disableSignature, setDisableSignature] = useState(false);
  const [isPortModalVisible, setPortModalVisible] = useState(false);
  const [screenUser, setScreenUser] = useState(user);
  const isPremium = screenUser?.membership_type === 'premium';

  // FIX: Bọc hàm trong useCallback để ổn định nó
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const timestamp = Date.now();
      const [userResponse, smtpResponse] = await Promise.all([
        api.get(`/api/users/me?_t=${timestamp}`),
        api.get(`/api/users/smtp-settings?_t=${timestamp}`).catch(err => err.response)
      ]);

      setScreenUser(userResponse.data);

      if (smtpResponse && smtpResponse.status === 200) {
        setSmtpSettings(smtpResponse.data);
        setFormState({
          server: smtpResponse.data.smtp_server,
          port: smtpResponse.data.smtp_port.toString(),
          email: smtpResponse.data.smtp_sender_email,
          password: '',
        });
        setDisableSignature(!(userResponse.data.append_cronpost_signature ?? true));
      } else {
         setSmtpSettings(null);
         setFormState({ server: '', port: '587', email: '', password: '' });
         setDisableSignature(false);
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // FIX: Thêm dependency cho useEffect
  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        smtp_server: formState.server,
        smtp_port: parseInt(formState.port, 10),
        smtp_sender_email: formState.email,
        smtp_password: formState.password,
      };
      await api.put('/api/users/smtp-settings', payload);
      Toast.show({ type: 'success', text1: t('settings_page.success_smtp_saved') });
      await fetchInitialData();
    } catch (error) {
      Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      t('settings_page.confirm_remove_smtp_title'),
      t('settings_page.confirm_remove_smtp_body'),
      [
        { text: t('settings_page.btn_cancel'), style: 'cancel' },
        { text: t('settings_page.btn_confirm'), style: 'destructive', onPress: async () => {
            try {
              await api.delete('/api/users/smtp-settings');
              Toast.show({ type: 'success', text1: t('settings_page.success_smtp_removed') });
              setSmtpSettings(null);
              setFormState({ server: '', port: '587', email: '', password: '' });
            } catch (error) {
              Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
            }
        }},
      ]
    );
  };

  const handleToggleSignature = async (value: boolean) => {
    if (!isPremium) {
      Toast.show({
        type: 'error',
        text1: t('header.modal_upgrade_title'),
        text2: t('errors.ERR_AUTH_PREMIUM_REQUIRED_SIGNATURE'),
      });
      return;
    }

    const originalValue = disableSignature;
    setDisableSignature(value);

    try {
        await api.put('/api/users/smtp-settings/signature', { append_signature: !value });
        Toast.show({
            type: 'success',
            text1: t('settings_page.success_smtp_signature_updated')
        });
    } catch (error) {
        Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
        setDisableSignature(originalValue);
    }
  }
  const getStatusInfo = () => {
    if (!smtpSettings) return { text: t('settings_page.status_not_configured'), color: themeColors.icon };
    if (smtpSettings.is_active) return { text: t('settings_page.status_active'), color: '#28a745' };
    return { text: t('settings_page.status_inactive_test_required'), color: '#ffc107' };
  };

  const statusInfo = getStatusInfo();
  const isFormDisabled = smtpSettings?.is_active || false;
  const portOptions = [
      { label: '587 (TLS/STARTTLS)', value: '587' },
      { label: '465 (SSL)', value: '465' }
  ];

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    scrollContainer: { padding: 20 },
    card: { backgroundColor: themeColors.inputBackground, borderRadius: 8, padding: 15, marginBottom: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: themeColors.inputBorder },
    statusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    statusLabel: { fontSize: 16, color: themeColors.text, marginRight: 8 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
    statusBadgeText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    inputGroup: { marginBottom: 15 },
    label: { fontSize: 16, marginBottom: 8, color: themeColors.text },
    input: { height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text, backgroundColor: themeColors.background },
    disabledInput: { backgroundColor: themeColors.inputBorder, color: themeColors.icon },
    pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, backgroundColor: themeColors.background },
    pickerButtonText: { fontSize: 16, color: themeColors.text },
    noteText: { fontSize: 12, color: themeColors.icon, marginTop: 4 },
    button: { backgroundColor: themeColors.tint, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    removeButton: { backgroundColor: '#dc3545' },
    signatureContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
    signatureTextContainer: { flex: 1, marginRight: 10 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { width: '90%', maxHeight: '80%', backgroundColor: themeColors.background, borderRadius: 10, padding: 15 },
    modalHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalHeader: { fontSize: 18, fontWeight: 'bold', color: themeColors.text, textAlign: 'center', flex: 1 },
    modalCloseButton: { padding: 5 },
    modalItem: { paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder },
    modalItemText: { color: themeColors.text, fontSize: 16 },
  });

  if (isLoading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={themeColors.tint} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
            <View style={styles.statusContainer}><Text style={styles.statusLabel}>{t('settings_page.smtp_status_label')}</Text><View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}><Text style={styles.statusBadgeText}>{statusInfo.text}</Text></View></View>
            <View style={styles.inputGroup}><Text style={styles.label}>{t('settings_page.smtp_server_label')}</Text><TextInput style={[styles.input, isFormDisabled && styles.disabledInput]} value={formState.server} onChangeText={text => setFormState({...formState, server: text})} editable={!isFormDisabled} /></View>
            <View style={styles.inputGroup}><Text style={styles.label}>{t('settings_page.smtp_port_label')}</Text><TouchableOpacity style={[styles.pickerButton, isFormDisabled && styles.disabledInput]} onPress={() => !isFormDisabled && setPortModalVisible(true)} disabled={isFormDisabled}><Text style={styles.pickerButtonText}>{portOptions.find(p => p.value === formState.port)?.label || formState.port}</Text><Ionicons name="chevron-down" size={20} color={themeColors.icon} /></TouchableOpacity></View>
            <View style={styles.inputGroup}><Text style={styles.label}>{t('settings_page.smtp_sender_label')}</Text><TextInput style={[styles.input, isFormDisabled && styles.disabledInput]} value={formState.email} onChangeText={text => setFormState({...formState, email: text})} keyboardType="email-address" autoCapitalize="none" editable={!isFormDisabled} /></View>
            <View style={styles.inputGroup}><Text style={styles.label}>{t('settings_page.smtp_password_label')}</Text><TextInput style={[styles.input, isFormDisabled && styles.disabledInput]} placeholder={isFormDisabled ? t('settings_page.smtp_password_placeholder_set') : ''} placeholderTextColor={themeColors.icon} value={formState.password} onChangeText={text => setFormState({...formState, password: text})} secureTextEntry editable={!isFormDisabled} /><Text style={styles.noteText}>{t('settings_page.smtp_password_note')}</Text></View>

            {!isFormDisabled && (<TouchableOpacity style={styles.button} onPress={handleSave} disabled={isSaving}>{isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('settings_page.btn_save_smtp')}</Text>}</TouchableOpacity>)}
            {isFormDisabled && (<TouchableOpacity style={[styles.button, styles.removeButton]} onPress={handleRemove}><Text style={styles.buttonText}>{t('settings_page.btn_remove_smtp')}</Text></TouchableOpacity>)}
            {smtpSettings && (<View style={styles.signatureContainer}><View style={styles.signatureTextContainer}><Text style={styles.label}>{t('settings_page.smtp_disable_signature_label')}</Text></View><Switch trackColor={{ false: themeColors.inputBorder, true: themeColors.tint }} thumbColor={'#fff'} onValueChange={handleToggleSignature} value={disableSignature} disabled={!isPremium} /></View>)}
        </View>
      </ScrollView>
      
      <Modal visible={isPortModalVisible} transparent={true} animationType="fade" onRequestClose={() => setPortModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPortModalVisible(false)}>
            <Pressable style={[styles.modalContent, {maxHeight: '40%'}]} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeaderContainer}><Text style={styles.modalHeader}>{t('settings_page.smtp_port_label')}</Text><TouchableOpacity style={styles.modalCloseButton} onPress={() => setPortModalVisible(false)}><Ionicons name="close" size={24} color={themeColors.text} /></TouchableOpacity></View>
                {portOptions.map(option => (<TouchableOpacity key={option.value} style={styles.modalItem} onPress={() => { setFormState({...formState, port: option.value}); setPortModalVisible(false); }}><Text style={styles.modalItemText}>{option.label}</Text></TouchableOpacity>))}
            </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
};

export default SmtpScreen;