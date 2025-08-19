// app/(main)/settings/contactPicker.tsx
// Version: 1.2.0 (Fully Type-Safe)

import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
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

interface ValidDeviceContact extends Contacts.Contact {
  id: string;
  emails: (Contacts.Email & { email: string })[];
}

const ContactPickerScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const router = useRouter();
  const { currentContactCount } = useLocalSearchParams<{ currentContactCount?: string }>();
  const [deviceContacts, setDeviceContacts] = useState<ValidDeviceContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState(new Set<string>());
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const MAX_CONTACTS = 10000;
  const currentCount = parseInt(currentContactCount || '0', 10);
  const remainingSpace = MAX_CONTACTS - currentCount;

  useEffect(() => {
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
            type: 'error',
            text1: t('contacts_page.permission_denied_title'),
            text2: t('contacts_page.permission_denied_body'),
            visibilityTime: 4000,
            onHide: () => router.back()
        });
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Emails, Contacts.Fields.Name],
      });

      const validContacts = data.filter(
        (c): c is ValidDeviceContact =>
          !!c.id && Array.isArray(c.emails) && c.emails.length > 0 && typeof c.emails[0].email === 'string'
      );
      
      setDeviceContacts(validContacts);
      setIsLoading(false);
    })();
  }, [router, t]);

  const handleToggleContact = (contactId: string) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      if (remainingSpace <= newSelection.size) {
        Toast.show({
            type: 'info',
            text1: t('contacts_page.import_limit_reached_toast')
        });
        return;
      }
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
      await api.post('/api/users/contacts/batch', { contacts: contactsToImport });
      Toast.show({
          type: 'success',
          text1: t('contacts_page.import_success', { count: contactsToImport.length }),
          onHide: () => router.back()
      });
    } catch (error) {
      Toast.show({
          type: 'error',
          text1: t('contacts_page.import_failed'),
          text2: translateApiError(error)
      });
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

  const renderItem = ({ item }: { item: ValidDeviceContact }) => {
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
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { color: themeColors.icon, fontSize: 16, textAlign: 'center' },
    itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder, backgroundColor: themeColors.card },
    itemTextContainer: { flex: 1, marginLeft: 15 },
    itemLabel: { fontSize: 16, color: themeColors.text },
    itemDescription: { fontSize: 14, color: themeColors.icon, marginTop: 2 },
    footer: { padding: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: themeColors.inputBorder, backgroundColor: themeColors.card },
    importButton: { backgroundColor: themeColors.tint, padding: 15, borderRadius: 8, alignItems: 'center' },
    importButtonDisabled: { backgroundColor: themeColors.icon },
    importButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    header: { padding: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder, backgroundColor: themeColors.card },
    infoText: { color: themeColors.icon, fontSize: 12, textAlign: 'center', marginTop: 10 },
    searchInput: { height: 40, backgroundColor: themeColors.inputBackground, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text },
  });

  if (isLoading) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator size="large" color={themeColors.tint} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TextInput style={styles.searchInput} placeholder={t('contacts_page.import_search_placeholder')} placeholderTextColor={themeColors.icon} value={searchQuery} onChangeText={setSearchQuery} />
        {remainingSpace > 0 && (
            <Text style={styles.infoText}>
                {t('contacts_page.import_limit_info', { remaining: remainingSpace })}
            </Text>
        )}
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