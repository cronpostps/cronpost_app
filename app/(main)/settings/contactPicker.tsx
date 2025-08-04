// app/(main)/settings/contactPicker.tsx
// Version: 1.0.1

import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

const ContactPickerScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const router = useRouter();

  const [deviceContacts, setDeviceContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('contacts_page.permission_denied_title'),
          t('contacts_page.permission_denied_body'),
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Emails, Contacts.Fields.Name],
      });

      const contactsWithEmail = data.filter(c => c.emails && c.emails.length > 0);
      setDeviceContacts(contactsWithEmail);
      setIsLoading(false);
    })();
  }, []);
  
  const handleToggleContact = (contactId) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    setSelectedContacts(newSelection);
  };

  const handleImport = async () => {
    if (selectedContacts.size === 0) return;
    setIsImporting(true);
    
    const contactsToImport = deviceContacts
      .filter(c => selectedContacts.has(c.id))
      .map(c => ({
        contact_email: c.emails[0].email,
        contact_name: c.name,
      }));

    try {
      // --- LỖI ĐÃ ĐƯỢC SỬA TẠI ĐÂY ---
      // Wrap the array in an object with the "contacts" key
      await api.post('/api/users/contacts/batch', { contacts: contactsToImport });
      Alert.alert(t('contacts_page.import_success', { count: contactsToImport.length }));
      router.back();
    } catch (error) {
      Alert.alert(t('contacts_page.import_failed'), translateApiError(error));
    } finally {
      setIsImporting(false);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return deviceContacts;
    return deviceContacts.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.emails[0].email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, deviceContacts]);

  const renderItem = ({ item }) => {
    const isSelected = selectedContacts.has(item.id);
    return (
      <TouchableOpacity style={styles.itemContainer} onPress={() => handleToggleContact(item.id)}>
        <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={24} color={themeColors.tint} />
        <View style={styles.itemTextContainer}>
          <Text style={styles.itemLabel}>{item.name}</Text>
          <Text style={styles.itemDescription}>{item.emails[0].email}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    header: { padding: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder },
    searchInput: { height: 40, backgroundColor: themeColors.inputBackground, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text },
    listContainer: { flex: 1 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { color: themeColors.icon, fontSize: 16, textAlign: 'center' },
    itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder, backgroundColor: themeColors.inputBackground },
    itemTextContainer: { flex: 1, marginLeft: 15 },
    itemLabel: { fontSize: 16, color: themeColors.text },
    itemDescription: { fontSize: 14, color: themeColors.icon, marginTop: 2 },
    footer: { padding: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: themeColors.inputBorder },
    importButton: { backgroundColor: themeColors.tint, padding: 15, borderRadius: 8, alignItems: 'center' },
    importButtonDisabled: { backgroundColor: themeColors.icon },
    importButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  });

  if (isLoading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={themeColors.tint} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TextInput style={styles.searchInput} placeholder={t('contacts_page.import_search_placeholder')} placeholderTextColor={themeColors.icon} value={searchQuery} onChangeText={setSearchQuery} />
      </View>
      <FlatList
        data={filteredContacts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => <View style={styles.emptyContainer}><Text style={styles.emptyText}>{t('contacts_page.no_contacts_found')}</Text></View>}
      />
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.importButton, selectedContacts.size === 0 && styles.importButtonDisabled]} 
          onPress={handleImport}
          disabled={selectedContacts.size === 0 || isImporting}
        >
          {isImporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.importButtonText}>{t('contacts_page.btn_import_selected', { count: selectedContacts.size })}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ContactPickerScreen;
