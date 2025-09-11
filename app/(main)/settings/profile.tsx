// app/(main)/settings/profile.tsx
// Version: 1.3.4

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

interface TimezoneItem {
  name: string;
  offset: string;
}
interface UserData {
  email: string;
  user_name: string;
  timezone: string;
  date_format: string;
  membership_type: 'free' | 'premium';
  max_active_messages: number;
  messages_remaining: number;
  max_stored_messages: number;
  stored_messages_remaining: number;
  uploaded_storage_bytes: number;
  storage_limit_gb: number;
}

const getGmtString = (timeZone: string) => {
  try {
    const date = new Date();
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' }).formatToParts(date);
    return parts.find(part => part.type === 'timeZoneName')?.value || 'GMT';
  } catch {
    return 'GMT'; 
  }
};

const dateFormats = [
    { label: 'dd/mm/yyyy', value: 'dd/mm/yyyy' },
    { label: 'mm/dd/yyyy', value: 'mm/dd/yyyy' },
    { label: 'yyyy/mm/dd', value: 'yyyy/mm/dd' },
];

const ProgressBar = ({ value, max }: { value: number; max: number }) => {
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  const styles = StyleSheet.create({
    progressBarBackground: { height: 8, backgroundColor: themeColors.inputBorder, borderRadius: 4, marginTop: 4, marginBottom: 15 },
    progressBarFill: { height: '100%', borderRadius: 4, backgroundColor: themeColors.tint, width: `${percentage}%` },
  });

  return (
    <View style={styles.progressBarBackground}>
      <View style={styles.progressBarFill} />
    </View>
  );
};

const ProfileScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { refreshUser } = useAuth();
  const themeColors = Colors[theme];

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [formState, setFormState] = useState({ userName: '', timezone: '', dateFormat: 'dd/mm/yyyy' });
  
  const [isTimezoneModalVisible, setTimezoneModalVisible] = useState(false);
  const [isDateFormatModalVisible, setDateFormatModalVisible] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [timezonesList, setTimezonesList] = useState<TimezoneItem[]>([]);

  const filteredTimezones = useMemo(() => {
    if (!timezoneSearch) return timezonesList;
    return timezonesList.filter((tz: TimezoneItem) => tz.name.toLowerCase().includes(timezoneSearch.toLowerCase()));
  }, [timezoneSearch, timezonesList]);

  const fetchInitialData = useCallback(async () => {
    try {
      const [userResponse, timezonesResponse] = await Promise.all([
        api.get('/api/users/me'),
        api.get('/api/users/timezones')
      ]);

      setUserData(userResponse.data);
      setFormState({
        userName: userResponse.data.user_name || '',
        timezone: userResponse.data.timezone || 'UTC',
        dateFormat: userResponse.data.date_format || 'dd/mm/yyyy',
      });
      
      const formattedTimezones = timezonesResponse.data.map((tz: string): TimezoneItem => ({
          name: tz,
          offset: getGmtString(tz),
      })).sort((a: TimezoneItem, b: TimezoneItem) => {
          const offsetA = parseInt(a.offset.replace('GMT', '').split(':')[0], 10);
          const offsetB = parseInt(b.offset.replace('GMT', '').split(':')[0], 10);
          return offsetA - offsetB;
      });
      setTimezonesList(formattedTimezones);

    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.fetch_user'),
        text2: translateApiError(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const payload = {
        user_name: formState.userName,
        timezone: formState.timezone,
        date_format: formState.dateFormat,
      };
      await api.put('/api/users/profile', payload);
      await refreshUser();

      Toast.show({
        type: 'success',
        text1: t('profile_page.success_profile_saved'),
      });

      await fetchInitialData();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('errors.save_profile'),
        text2: translateApiError(error),
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    scrollContainer: { padding: 20, paddingBottom: 50 },
    sectionHeader: { fontSize: 14, fontWeight: 'bold', color: themeColors.icon, textTransform: 'uppercase', marginBottom: 10, marginTop: 10 },
    card: { backgroundColor: themeColors.inputBackground, borderRadius: 8, padding: 15, marginBottom: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: themeColors.inputBorder },
    inputGroup: { marginBottom: 15 },
    label: { fontSize: 16, marginBottom: 8, color: themeColors.text },
    input: { height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text, backgroundColor: themeColors.background },
    disabledInput: { backgroundColor: themeColors.inputBorder, color: themeColors.icon },
    pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, backgroundColor: themeColors.background },
    pickerButtonText: { fontSize: 16, color: themeColors.text },
    saveButton: { backgroundColor: themeColors.tint, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    usageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    valueText: { fontSize: 16, color: themeColors.text, fontWeight: '500' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { width: '90%', maxHeight: '80%', backgroundColor: themeColors.background, borderRadius: 10, padding: 15 },
    modalHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalHeader: { fontSize: 18, fontWeight: 'bold', color: themeColors.text, textAlign: 'center', flex: 1 },
    modalCloseButton: { padding: 5 },
    modalSearchInput: { height: 40, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, marginBottom: 10, color: themeColors.text },
    modalItem: { paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder },
    modalItemText: { color: themeColors.text, fontSize: 16 },
        deleteButton: {
      backgroundColor: 'transparent',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#ff453a',
    },
    deleteButtonText: {
        color: '#ff453a',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalItemSubText: { color: themeColors.icon, fontSize: 12 },
  });

  if (isLoading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={themeColors.tint} /></View>;
  }
  if (!userData) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><Text style={{ color: themeColors.text }}>{t('errors.fetch_user')}</Text></View>;
  }

  const activeMessagesUsed = userData.max_active_messages - userData.messages_remaining;
  const storedMessagesUsed = userData.max_stored_messages - userData.stored_messages_remaining;
  const storageUsedGB = (userData.uploaded_storage_bytes / (1024 * 1024 * 1024)).toFixed(2);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.sectionHeader}>{t('profile_page.profile_info_header')}</Text>
        <View style={styles.card}>
          <View style={styles.inputGroup}><Text style={styles.label}>{t('profile_page.email_label')}</Text><TextInput style={[styles.input, styles.disabledInput]} value={userData.email} editable={false} /></View>
          <View style={styles.inputGroup}><Text style={styles.label}>{t('profile_page.username_label')}</Text><TextInput style={styles.input} value={formState.userName} onChangeText={(text) => setFormState({ ...formState, userName: text })} /></View>
          <View style={styles.inputGroup}><Text style={styles.label}>{t('profile_page.timezone_label')}</Text><TouchableOpacity style={styles.pickerButton} onPress={() => setTimezoneModalVisible(true)}><Text style={styles.pickerButtonText}>{formState.timezone}</Text><Ionicons name="chevron-down" size={20} color={themeColors.icon} /></TouchableOpacity></View>
          <View style={styles.inputGroup}><Text style={styles.label}>{t('profile_page.date_format_label')}</Text><TouchableOpacity style={styles.pickerButton} onPress={() => setDateFormatModalVisible(true)}><Text style={styles.pickerButtonText}>{formState.dateFormat}</Text><Ionicons name="chevron-down" size={20} color={themeColors.icon} /></TouchableOpacity></View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={isSaving}>{isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>{t('profile_page.btn_save_profile')}</Text>}</TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>{t('profile_page.subscription_header')}</Text>
        <View style={styles.card}>
            <View style={styles.usageRow}><Text style={styles.label}>{t('profile_page.membership_label')}</Text><Text style={[styles.valueText, { color: themeColors.tint, fontWeight: 'bold' }]}>{t(`profile_page.membership_${userData.membership_type}`)}</Text></View>
            <View style={styles.usageRow}><Text style={styles.label}>{t('profile_page.active_messages_label')}</Text><Text style={styles.valueText}>{`${activeMessagesUsed} / ${userData.max_active_messages}`}</Text></View>
            <ProgressBar value={activeMessagesUsed} max={userData.max_active_messages} />
            <View style={styles.usageRow}><Text style={styles.label}>{t('profile_page.stored_messages_label')}</Text><Text style={styles.valueText}>{`${storedMessagesUsed} / ${userData.max_stored_messages}`}</Text></View>
            <ProgressBar value={storedMessagesUsed} max={userData.max_stored_messages} />
            {userData.membership_type === 'premium' && (<View><View style={styles.usageRow}><Text style={styles.label}>{t('profile_page.storage_usage_label')}</Text><Text style={styles.valueText}>{`${storageUsedGB} GB / ${userData.storage_limit_gb} GB`}</Text></View><ProgressBar value={userData.uploaded_storage_bytes} max={userData.storage_limit_gb * 1024 * 1024 * 1024} /></View>)}
        </View>
        <Text style={[styles.sectionHeader, { color: '#ff453a' }]}>{t('delete_account_page.title')}</Text>
        <View style={styles.card}>
            <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => router.push('/settings/delete-account')}
            >
                <Text style={styles.deleteButtonText}>{t('delete_account_page.title')}</Text>
            </TouchableOpacity>
        </View>        
      </ScrollView>

      <Modal visible={isTimezoneModalVisible} transparent={true} animationType="fade" onRequestClose={() => setTimezoneModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTimezoneModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderContainer}><Text style={styles.modalHeader}>{t('profile_page.timezone_label')}</Text><TouchableOpacity style={styles.modalCloseButton} onPress={() => setTimezoneModalVisible(false)}><Ionicons name="close" size={24} color={themeColors.text} /></TouchableOpacity></View>
            <TextInput style={styles.modalSearchInput} placeholder="Search timezone..." placeholderTextColor={themeColors.icon} value={timezoneSearch} onChangeText={setTimezoneSearch} />
            <FlatList data={filteredTimezones} keyExtractor={(item) => item.name} renderItem={({ item }: { item: TimezoneItem }) => (<TouchableOpacity style={styles.modalItem} onPress={() => { setFormState({...formState, timezone: item.name}); setTimezoneModalVisible(false); setTimezoneSearch(''); }}><Text style={styles.modalItemText}>{item.name}</Text><Text style={styles.modalItemSubText}>{item.offset}</Text></TouchableOpacity>)} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={isDateFormatModalVisible} transparent={true} animationType="fade" onRequestClose={() => setDateFormatModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDateFormatModalVisible(false)}>
            <Pressable style={[styles.modalContent, {maxHeight: '40%'}]} onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalHeaderContainer}><Text style={styles.modalHeader}>{t('profile_page.date_format_label')}</Text><TouchableOpacity style={styles.modalCloseButton} onPress={() => setDateFormatModalVisible(false)}><Ionicons name="close" size={24} color={themeColors.text} /></TouchableOpacity></View>
                {dateFormats.map(format => (<TouchableOpacity key={format.value} style={styles.modalItem} onPress={() => { setFormState({...formState, dateFormat: format.value}); setDateFormatModalVisible(false); }}><Text style={styles.modalItemText}>{format.label}</Text></TouchableOpacity>))}
            </Pressable>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
};

export default ProfileScreen;