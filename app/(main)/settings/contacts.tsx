// app/(main)/settings/contacts.tsx
// Version: 1.1.0

import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

const ContactsScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const themeColors = Colors[theme];

  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedContact, setSelectedContact] = useState(null);
  const [formState, setFormState] = useState({ email: '', name: '' });

  const swipeableRefs = useRef({});

  const fetchContacts = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/users/contacts');
      setContacts(response.data);
    } catch (error) {
      Alert.alert(t('contacts_page.loading_error'), translateApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleImportContacts = async () => {
    const { status } = await Contacts.getPermissionsAsync();
    if (status !== 'granted') {
        const { status: newStatus } = await Contacts.requestPermissionsAsync();
        if (newStatus !== 'granted') {
            setTimeout(() => {
                Alert.alert(t('contacts_page.permission_denied_title'), t('contacts_page.permission_denied_body'));
            }, 100);
            return;
        }
    }
    router.push('/settings/contactPicker');
  };

  const openModal = (mode: 'add' | 'edit', contact = null) => {
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
      fetchContacts();
    } catch (error) {
        Alert.alert('Error', translateApiError(error));
    }
  };
  
  const handleDelete = (contact) => {
      Alert.alert(
          t('contacts_page.confirm_delete_title'),
          t('contacts_page.confirm_delete_body', { name: contact.display_name }),
          [
              { text: t('contacts_page.btn_cancel'), style: 'cancel' },
              { text: t('settings_page.btn_confirm'), style: 'destructive', onPress: async () => {
                  try {
                      await api.delete('/api/users/contacts', { data: { contact_email: contact.contact_email }});
                      fetchContacts();
                  } catch (error) {
                      Alert.alert('Error', translateApiError(error));
                  }
              }}
          ]
      )
  }

  const handleBlockToggle = async (contact) => {
    const action = contact.is_blocked ? 'unblock' : 'block';
    const email = contact.contact_email;
    
    // Close the swipeable row
    swipeableRefs.current[email]?.close();

    try {
        await api.post(`/api/users/${action}`, { blocked_user_email: email });
        // Optimistically update UI before refetching
        setContacts(prev => prev.map(c => c.contact_email === email ? {...c, is_blocked: !c.is_blocked} : c));
        // Then refetch for consistency
        await fetchContacts();
    } catch (error) {
        Alert.alert('Error', translateApiError(error));
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    return contacts.filter(c => 
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact_email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, contacts]);

  const renderRightActions = (progress, dragX, item) => {
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
          <Ionicons name={actionIcon} size={22} color="#fff" />
          <Text style={styles.actionButtonText}>{actionText}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderContact = ({ item }) => (
    <Swipeable
      ref={ref => (swipeableRefs.current[item.contact_email] = ref)}
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
    header: { padding: 15, backgroundColor: themeColors.inputBackground, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder },
    searchInput: { height: 40, backgroundColor: themeColors.background, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text },
    actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 },
    actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: themeColors.background },
    actionText: { color: themeColors.tint, marginLeft: 8, fontWeight: '500' },
    listContainer: { flex: 1 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: themeColors.icon, fontSize: 16 },
    itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder, backgroundColor: themeColors.inputBackground },
    itemTextContainer: { flex: 1 },
    itemLabel: { fontSize: 16, color: themeColors.text, fontWeight: '500' },
    itemDescription: { fontSize: 14, color: themeColors.icon, marginTop: 2 },
    badgeContainer: { flexDirection: 'row', marginRight: 10 },
    badge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, marginLeft: 5 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { width: '90%', backgroundColor: themeColors.background, borderRadius: 10, padding: 20 },
    modalHeader: { fontSize: 18, fontWeight: 'bold', color: themeColors.text, marginBottom: 20, textAlign: 'center' },
    input: { height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text, backgroundColor: themeColors.background, marginBottom: 15 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
    modalButtonText: { color: '#fff', fontWeight: 'bold' },
    rightAction: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    actionButtonText: { color: '#fff', fontSize: 12, marginTop: 4 },
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TextInput style={styles.searchInput} placeholder={t('contacts_page.search_placeholder')} placeholderTextColor={themeColors.icon} value={searchQuery} onChangeText={setSearchQuery} />
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={() => openModal('add')}>
              <Ionicons name="add-circle-outline" size={22} color={themeColors.tint} />
              <Text style={styles.actionText}>{t('contacts_page.add_new')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleImportContacts}>
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
              <TextInput style={styles.input} placeholder={t('contacts_page.label_email')} value={formState.email} onChangeText={text => setFormState({...formState, email: text})} editable={modalMode !== 'edit'} />
              {modalMode !== 'block' && <TextInput style={styles.input} placeholder={t('contacts_page.label_name')} value={formState.name} onChangeText={text => setFormState({...formState, name: text})} />}
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
