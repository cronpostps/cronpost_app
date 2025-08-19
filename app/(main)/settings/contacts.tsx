// app/(main)/settings/contacts.tsx
// Version: 1.2.0

import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

interface Contact {
  contact_email: string;
  contact_name: string;
  display_name: string;
  is_cronpost_user: boolean;
  is_blocked: boolean;
}

const ContactsScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const themeColors = Colors[theme];
  const MAX_CONTACTS = 10000;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [formState, setFormState] = useState({ email: '', name: '' });

  const swipeableRefs = useRef<{[key: string]: Swipeable | null}>({});

  const fetchContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/users/contacts');
      setContacts(response.data);
    } catch (error) {
      Toast.show({ type: 'error', text1: t('contacts_page.loading_error'), text2: translateApiError(error) });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      fetchContacts();
    }, [fetchContacts])
  );

  const handleImportContacts = async () => {
    const { status } = await Contacts.getPermissionsAsync();
    if (status !== 'granted') {
        const { status: newStatus } = await Contacts.requestPermissionsAsync();
        if (newStatus !== 'granted') {
            setTimeout(() => {
                Toast.show({ type: 'error', text1: t('contacts_page.permission_denied_title'), text2: t('contacts_page.permission_denied_body')});
            }, 100);
            return;
        }
    }
    router.push({
        pathname: '/settings/contactPicker',
        params: { currentContactCount: contacts.length }
    });
  };

  const openModal = (mode: 'add' | 'edit', contact: Contact | null = null) => {
    setModalMode(mode);
    setSelectedContact(contact);
    setFormState({
      email: contact?.contact_email || '',
      name: contact?.contact_name || '',
    });
    setModalVisible(true);
  };

  const handleModalSubmit = async () => {
    try {
      if (modalMode === 'add') {
        await api.post('/api/users/contacts', { contact_email: formState.email, contact_name: formState.name });
      } else if (modalMode === 'edit' && selectedContact) {
        await api.put(`/api/users/contacts/${selectedContact.contact_email}`, { contact_name: formState.name });
      }
      setModalVisible(false);
      await fetchContacts();
      Toast.show({type: 'success', text1: t('profile_page.success_profile_saved')});
    } catch (error) {
        Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
    }
  };
  
  const handleDelete = (contact: Contact) => {
      Alert.alert(
          t('contacts_page.confirm_delete_title'),
          t('contacts_page.confirm_delete_body', { name: contact.display_name }),
          [
              { text: t('contacts_page.btn_cancel'), style: 'cancel' },
              { text: t('settings_page.btn_confirm'), style: 'destructive', onPress: async () => {
                  try {
                      await api.delete('/api/users/contacts', { data: { contact_email: contact.contact_email }});
                      await fetchContacts();
                  } catch (error) {
                      Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
                  }
              }}
          ]
      )
  }

  // FIX: Thêm kiểu cho tham số `contact` và dùng Toast
  const handleBlockToggle = async (contact: Contact) => {
    const action = contact.is_blocked ? 'unblock' : 'block';
    const email = contact.contact_email;
    
    swipeableRefs.current[email]?.close();

    try {
        await api.post(`/api/users/${action}`, { blocked_user_email: email });
        setContacts(prev => prev.map(c => c.contact_email === email ? {...c, is_blocked: !c.is_blocked} : c));
        // Không cần fetch lại ngay vì đã cập nhật UI lạc quan (optimistic update)
    } catch (error) {
        Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
        // Nếu lỗi thì fetch lại để đồng bộ
        await fetchContacts();
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    // FIX: Thêm kiểu cho tham số `c`
    return contacts.filter((c: Contact) => 
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact_email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, contacts]);

  // FIX: Thêm kiểu cho các tham số
  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, item: Contact) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });
    
    const isBlocked = item.is_blocked;
    const actionText = isBlocked ? t('contacts_page.action_unblock') : t('contacts_page.action_block');
    const actionBgColor = isBlocked ? '#28a745' : '#dc3545';
    const actionIcon = isBlocked ? 'hand-left' : 'hand-left-outline';

    return (
      <Animated.View style={{ width: 80, transform: [{ translateX: trans }] }}>
        <TouchableOpacity
          style={[styles.rightAction, { backgroundColor: actionBgColor }]}
          onPress={() => handleBlockToggle(item)}>
          <Ionicons name={actionIcon as any} size={22} color="#fff" />
          <Text style={styles.actionButtonText}>{actionText}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // FIX: Thêm kiểu cho tham số `item`
  const renderContact = ({ item }: { item: Contact }) => (
    <Swipeable
      ref={ref => { swipeableRefs.current[item.contact_email] = ref; }}
      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
      overshootRight={false}
    >
        <TouchableOpacity style={styles.itemContainer} onLongPress={() => handleDelete(item)} onPress={() => openModal('edit', item)}>
        <View style={styles.itemTextContainer}>
            <Text style={styles.itemLabel}>{item.display_name}</Text>
            <Text style={styles.itemDescription}>{item.contact_email}</Text>
        </View>
        <View style={styles.badgeContainer}>
            {item.is_cronpost_user && <View style={[styles.badge, {backgroundColor: '#28a745'}]}><Text style={styles.badgeText}>{t('contacts_page.status_cp_user')}</Text></View>}
            {item.is_blocked && <View style={[styles.badge, {backgroundColor: '#dc3545'}]}><Text style={styles.badgeText}>{t('contacts_page.status_blocked')}</Text></View>}
        </View>
        <Ionicons name="chevron-forward" size={20} color={themeColors.icon} />
        </TouchableOpacity>
    </Swipeable>
  );

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    header: { padding: 15, backgroundColor: themeColors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder },
    searchInput: { height: 40, backgroundColor: themeColors.background, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text },
    actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 },
    listContainer: { flex: 1 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    emptyText: { color: themeColors.icon, fontSize: 16 },
    itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder, backgroundColor: themeColors.card },
    itemTextContainer: { flex: 1 },
    itemLabel: { fontSize: 16, color: themeColors.text, fontWeight: '500' },
    itemDescription: { fontSize: 14, color: themeColors.icon, marginTop: 2 },
    badgeContainer: { flexDirection: 'row', marginRight: 10 },
    badge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, marginLeft: 5 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { width: '90%', backgroundColor: themeColors.card, borderRadius: 10, padding: 20 },
    modalHeader: { fontSize: 18, fontWeight: 'bold', color: themeColors.text, marginBottom: 20, textAlign: 'center' },
    input: { height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text, backgroundColor: themeColors.background, marginBottom: 15 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
    modalButtonText: { color: '#fff', fontWeight: 'bold' },
    rightAction: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    actionButtonText: { color: '#fff', fontSize: 12, marginTop: 4 },
    actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: themeColors.background },
    actionButtonDisabled: { opacity: 0.5 },
    limitIndicator: { color: themeColors.icon, fontSize: 12, textAlign: 'center', marginTop: 10 },
    actionText: { color: themeColors.tint, marginLeft: 8, fontWeight: '500' },
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TextInput style={styles.searchInput} placeholder={t('contacts_page.search_placeholder')} placeholderTextColor={themeColors.icon} value={searchQuery} onChangeText={setSearchQuery} />
          <Text style={styles.limitIndicator}>
            {t('contacts_page.limit_indicator', { count: contacts.length, limit: MAX_CONTACTS })}
          </Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, contacts.length >= MAX_CONTACTS && styles.actionButtonDisabled]} 
              onPress={() => openModal('add')}
              disabled={contacts.length >= MAX_CONTACTS}
            >
              <Ionicons name="add-circle-outline" size={22} color={themeColors.tint} />
              <Text style={styles.actionText}>{t('contacts_page.add_new')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, contacts.length >= MAX_CONTACTS && styles.actionButtonDisabled]} 
              onPress={handleImportContacts}
              disabled={contacts.length >= MAX_CONTACTS}
            >
              <Ionicons name="person-add-outline" size={22} color={themeColors.tint} />
              <Text style={styles.actionText}>{t('contacts_page.import_from_device')}</Text>
            </TouchableOpacity>
          </View>
        </View>
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 20 }} size="large" color={themeColors.tint} />
        ) : (
          <FlatList
            data={filteredContacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.contact_email}
            ListEmptyComponent={() => <View style={styles.emptyContainer}><Text style={styles.emptyText}>{t('contacts_page.empty_list')}</Text></View>}
          />
        )}

        <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalHeader}>{t(`contacts_page.modal_${modalMode}_title`)}</Text>
              <TextInput style={styles.input} placeholder={t('contacts_page.label_email')} placeholderTextColor={themeColors.icon} value={formState.email} onChangeText={text => setFormState({...formState, email: text})} editable={modalMode !== 'edit'} keyboardType="email-address" autoCapitalize='none' />
              <TextInput style={styles.input} placeholder={t('contacts_page.label_name')} placeholderTextColor={themeColors.icon} value={formState.name} onChangeText={text => setFormState({...formState, name: text})} />
              <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalButton, {backgroundColor: themeColors.icon}]} onPress={() => setModalVisible(false)}><Text style={styles.modalButtonText}>{t('contacts_page.btn_cancel')}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.modalButton, {backgroundColor: themeColors.tint}]} onPress={handleModalSubmit}><Text style={styles.modalButtonText}>{t(`contacts_page.btn_${modalMode === 'edit' ? 'save_changes' : 'add_contact'}`)}</Text></TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default ContactsScreen;