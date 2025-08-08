// src/components/MessageComposer.tsx
// Version: 1.1.0

import { Ionicons } from '@expo/vector-icons';
import { TFunction } from 'i18next';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  actions,
  RichEditor,
  RichToolbar,
} from 'react-native-pell-rich-editor';
import Toast from 'react-native-toast-message';
import api from '../api/api';
import { Colors, Theme } from '../constants/Colors';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { translateApiError } from '../utils/errorTranslator';

// --- Interfaces & Types ---
interface Contact {
  contact_email: string;
  display_name: string;
}

export interface AttachmentFile {
  id: string;
  original_filename: string;
  filesize_bytes: number;
}

interface QuoteFolder {
  id: string;
  folder_key: string;
  author_email: string;
  description: string;
  type: 'System' | 'Owned' | 'Subscribed';
}

interface GroupedQuoteFolders {
  title: string;
  data: QuoteFolder[];
}

export interface MessageData {
    recipients: string[];
    subject: string;
    content: string;
    attachments: AttachmentFile[];
}

export type ActionType = 'send' | 'schedule' | 'save_draft';

export interface MessageComposerProps {
  initialData?: Partial<MessageData>;
  sendingMethod: 'in_app_messaging' | 'cronpost_email' | 'user_email';
  buttonSet: 'iam' | 'scm' | 'ucm';
  onAction: (action: ActionType, data: MessageData) => Promise<void>;
  onCancel: () => void;
}

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  t: TFunction;
  themeColors: Theme;
}

interface ContactPickerModalProps extends ModalProps {
  contacts: Contact[];
  isLoading: boolean;
  onSelect: (email: string) => void;
}

interface FilePickerModalProps extends ModalProps {
  files: AttachmentFile[];
  isLoading: boolean;
  onSelect: (selectedFiles: AttachmentFile[]) => void;
}

interface QuotePickerModalProps extends ModalProps {
    groupedFolders: GroupedQuoteFolders[];
    isLoading: boolean;
    onSelect: (folder: QuoteFolder) => void;
}


// --- Main Component ---
export default function MessageComposer({
    initialData,
    sendingMethod,
    buttonSet,
    onAction,
    onCancel,
}: MessageComposerProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const { user } = useAuth();

  const richText = useRef<RichEditor>(null);
  
  // --- State Management ---
  const [recipients, setRecipients] = useState<string[]>(initialData?.recipients || []);
  const [recipientInput, setRecipientInput] = useState('');
  const [subject, setSubject] = useState(initialData?.subject || '');
  const [attachments, setAttachments] = useState<AttachmentFile[]>(initialData?.attachments || []);
  const [isSending, setIsSending] = useState(false);
  const [modalVisible, setModalVisible] = useState<{ contacts: boolean; files: boolean; quotes: boolean }>({ contacts: false, files: false, quotes: false });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [userFiles, setUserFiles] = useState<AttachmentFile[]>([]);
  const [groupedQuoteFolders, setGroupedQuoteFolders] = useState<GroupedQuoteFolders[]>([]);
  const [isLoading, setIsLoading] = useState({ contacts: false, files: false, quotes: false });

  useEffect(() => {
    if (initialData?.content && richText.current) {
        richText.current.setContentHTML(initialData.content);
    }
  }, [initialData?.content]);

    // --- State & Logic for User Limits ---
  const [contentCharCount, setContentCharCount] = useState(0);

  const limits = useMemo(() => {
    if (!user) {
      return {
        recipients: 1,
        subject: 255,
        content: 5000,
      };
    }
    const membership = user.membership_type || 'free';
    const recipientLimitKey = `limit_recipients_${sendingMethod}_${membership}`;
    
    return {
      recipients: (user as any)[recipientLimitKey] || 1,
      subject: user.max_subject_length || 255,
      content: (membership === 'premium' 
        ? user.max_message_chars_premium 
        : user.max_message_chars_free) || 5000,
    };
  }, [user, sendingMethod]);

  // --- Recipient Pillbox Logic ---
  const handleRecipientInputChange = (text: string) => {
    if (text.endsWith(',') || text.endsWith(' ')) {
      const newEmail = text.slice(0, -1).trim();
      if (newEmail) addRecipient(newEmail);
      setRecipientInput('');
    } else {
      setRecipientInput(text);
    }
  };

  const addRecipient = (email: string) => {
    if (recipients.length >= limits.recipients) {
      Toast.show({
        type: 'error',
        text1: t('errors.title_error'),
        text2: t('editor_component.feedback_recipient_limit', { limit: limits.recipients })
      });
      return;
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail && !recipients.includes(trimmedEmail) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setRecipients([...recipients, trimmedEmail]);
    }
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };


  // --- Data Fetching for Modals ---
  const fetchContacts = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, contacts: true }));
    try {
      const response = await api.get('/api/users/contacts');
      const contactFilter = sendingMethod === 'in_app_messaging' 
          ? (c: { is_cronpost_user: boolean }) => c.is_cronpost_user 
          : () => true;
      setContacts(response.data.filter(contactFilter));
      setModalVisible(prev => ({ ...prev, contacts: true }));
    } catch (error) {
      Alert.alert(t('errors.title_error'), translateApiError(error));
    } finally {
      setIsLoading(prev => ({ ...prev, contacts: false }));
    }
  }, [t, sendingMethod]);

  const fetchUserFiles = useCallback(async () => {
    if (user?.membership_type !== 'premium') {
      return Alert.alert(t('header.modal_upgrade_title'), t('header.modal_upgrade_body'));
    }
    setIsLoading(prev => ({ ...prev, files: true }));
    try {
      const response = await api.get('/api/files/');
      setUserFiles(response.data);
      setModalVisible(prev => ({ ...prev, files: true }));
    } catch (error) {
      Alert.alert(t('errors.title_error'), translateApiError(error));
    } finally {
      setIsLoading(prev => ({ ...prev, files: false }));
    }
  }, [user, t]);
  
  const fetchQuoteFolders = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, quotes: true }));
    try {
        const response = await api.get('/api/quotes/folders');
        const folders: QuoteFolder[] = [
          ...response.data.system_folders.map((f: any) => ({...f, author_email: f.author_key, type: 'System'})),
          ...response.data.user_folders.map((f: any) => ({...f, author_email: f.author_key, type: 'Owned'})),
          ...response.data.subscribed_folders.map((f: any) => ({...f, author_email: f.author_key, type: 'Subscribed'}))
        ];

        const groups: { [key: string]: QuoteFolder[] } = { System: [], Owned: [], Subscribed: [] };
        folders.forEach(folder => {
            if (groups[folder.type]) groups[folder.type].push(folder);
        });

        const groupedData: GroupedQuoteFolders[] = [
            { title: t('quotes_page.system_folders_header'), data: groups.System },
            { title: t('quotes_page.user_folders_header'), data: groups.Owned },
            { title: t('quotes_page.subscribed_folders_header'), data: groups.Subscribed },
        ].filter(group => group.data.length > 0);

        setGroupedQuoteFolders(groupedData);
        setModalVisible(prev => ({...prev, quotes: true}));
    } catch (error) {
        Alert.alert(t('errors.title_error'), translateApiError(error));
    } finally {
        setIsLoading(prev => ({ ...prev, quotes: false }));
    }
  }, [t]);
  
  const handleContentChange = (html: string) => {
    const text = html.replace(/<[^>]*>?/gm, '');
    setContentCharCount(text.length);
  };


  // --- Modal Selection Handlers ---
  const handleSelectContact = (email: string) => {
    addRecipient(email);
    setModalVisible(prev => ({...prev, contacts: false}));
  };
  
  const handleSelectFiles = (selectedFiles: AttachmentFile[]) => {
      setAttachments(prev => {
          const newAttachments = [...prev];
          selectedFiles.forEach(file => {
              if (!newAttachments.some(a => a.id === file.id)) newAttachments.push(file);
          });
          return newAttachments;
      });
      setModalVisible(prev => ({...prev, files: false}));
  };
  
  const handleSelectQuoteFolder = (folder: QuoteFolder) => {
      const placeholder = ` {{quote:'${folder.author_email}','${folder.folder_key}'}} `;
      richText.current?.insertText(placeholder);
      setModalVisible(prev => ({...prev, quotes: false}));
  };

  const removeAttachment = (fileId: string) => {
      setAttachments(prev => prev.filter(f => f.id !== fileId));
  };


  // --- Main Action Handler ---
  const handleAction = async (action: ActionType) => {
    if (contentCharCount > limits.content) {
      return Alert.alert(t('errors.title_error'), t('errors.ERR_VALIDATION_CONTENT_TOO_LONG', { limit: limits.content }));
    }
    
    let content = await richText.current?.getContentHtml() || '';
    content = content.replace(/<\/div>/g, '<br>').replace(/<div>/g, '');
    if (content.endsWith('<br>')) {
      content = content.slice(0, -4);
    }

    if (recipients.length === 0 || !content.trim()) {
      return Alert.alert(t('errors.title_error'), t('editor_component.alert_required_fields'));
    }
    
    setIsSending(true);
    Keyboard.dismiss();

    const data: MessageData = {
        recipients,
        subject,
        content,
        attachments
    };

    try {
        await onAction(action, data);
    } catch (error) {
        console.error("Action failed in MessageComposer:", error);
    } finally {
        setIsSending(false);
    }
  };
  
  // --- UI ---
  const s = styles(themeColors);
  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={onCancel} disabled={isSending}>
            <Ionicons name="close" size={28} color={isSending ? themeColors.icon : themeColors.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('iam_page.btn_compose')}</Text>
          <TouchableOpacity style={[s.sendButton, isSending && s.sendButtonDisabled]} onPress={() => handleAction('send')} disabled={isSending}>
            {isSending ? <ActivityIndicator color="#fff" /> : <Text style={s.sendButtonText}>{t('editor_component.btn_send')}</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.inputContainer} activeOpacity={1} onPress={() => Keyboard.dismiss()}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillScrollView}>
            {recipients.map((email, index) => (
              <View key={index} style={s.pill}>
                <Text style={s.pillText}>{email}</Text>
                <TouchableOpacity onPress={() => removeRecipient(index)}>
                  <Ionicons name="close-circle" size={16} color={themeColors.background} />
                </TouchableOpacity>
              </View>
            ))}
            <TextInput
              style={s.recipientTextInput}
              placeholder={recipients.length === 0 ? t('editor_component.label_recipients') : ''}
              placeholderTextColor={themeColors.icon}
              value={recipientInput}
              onChangeText={handleRecipientInputChange}
              onSubmitEditing={() => { addRecipient(recipientInput); setRecipientInput(''); }}
              editable={!isSending && recipients.length < limits.recipients}
              autoCapitalize="none" keyboardType="email-address"
            />
          </ScrollView>
          <Text style={s.counterText}>
            {t('editor_component.feedback_recipient_count', { count: recipients.length, limit: limits.recipients })}
          </Text>
          <TouchableOpacity style={s.contactButton} onPress={fetchContacts} disabled={isSending || isLoading.contacts}>
            {isLoading.contacts ? <ActivityIndicator size="small" /> : <Ionicons name="person-add-outline" size={24} color={isSending ? themeColors.icon : themeColors.tint} />}
          </TouchableOpacity>
        </TouchableOpacity>
        
        <View style={[s.inputContainer, {alignItems: 'flex-end'}]}>
          <TextInput 
            style={s.inputField} 
            placeholder={t('editor_component.label_subject')} 
            placeholderTextColor={themeColors.icon} 
            value={subject} 
            onChangeText={setSubject} 
            editable={!isSending}
            maxLength={limits.subject}
          />
          <Text style={[s.counterText, {paddingBottom: 15}]}>
            {subject.length}/{limits.subject}
          </Text>
        </View>

        {attachments.length > 0 && (
          <View style={s.attachmentsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {attachments.map(file => (
              <View key={file.id} style={s.attachmentPill}>
                <Text style={s.attachmentText} numberOfLines={1}>{file.original_filename}</Text>
                <TouchableOpacity onPress={() => removeAttachment(file.id)} disabled={isSending}>
                  <Ionicons name="close-circle" size={18} style={s.attachmentRemoveIcon} />
                </TouchableOpacity>
              </View>
            ))}
            </ScrollView>
          </View>
        )}
        
        <View style={{flex: 1, paddingHorizontal: 15, paddingTop: 10}}>
          <RichEditor
            ref={richText}
            placeholder={t('editor_component.label_message')}
            editorStyle={{ backgroundColor: themeColors.background, color: themeColors.text, placeholderColor: themeColors.icon }}
            disabled={isSending}
            useContainer={false}
            onChange={handleContentChange}
          />
          <Text style={[s.counterText, contentCharCount > limits.content && s.errorText]}>
              {contentCharCount}/{limits.content}
          </Text>
        </View>

      <View style={s.toolbarContainer}>
        <RichToolbar
          editor={richText}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.insertBulletsList,
            actions.insertOrderedList,
          ]}
          style={s.richEditorToolbar}
          selectedIconTint={themeColors.tint}
          iconTint={themeColors.icon}
          disabled={isSending}
        />
        <View style={s.customActionsContainer}>
          <TouchableOpacity onPress={fetchUserFiles} disabled={isSending || isLoading.files} style={s.toolbarButton}>
              {isLoading.files ? <ActivityIndicator size="small" color={themeColors.tint} /> : <Ionicons name="attach" size={22} color={themeColors.tint} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={fetchQuoteFolders} disabled={isSending || isLoading.quotes} style={s.toolbarButton}>
              {isLoading.quotes ? <ActivityIndicator size="small" color={themeColors.tint} /> : <Ionicons name="bookmark-outline" size={22} color={themeColors.tint} />}
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>

      <ContactPickerModal visible={modalVisible.contacts} onClose={() => setModalVisible(p => ({...p, contacts: false}))} contacts={contacts} isLoading={isLoading.contacts} onSelect={handleSelectContact} t={t} themeColors={themeColors} />
      <FilePickerModal visible={modalVisible.files} onClose={() => setModalVisible(p => ({...p, files: false}))} files={userFiles} isLoading={isLoading.files} onSelect={handleSelectFiles} t={t} themeColors={themeColors} />
      <QuotePickerModal visible={modalVisible.quotes} onClose={() => setModalVisible(p => ({...p, quotes: false}))} groupedFolders={groupedQuoteFolders} isLoading={isLoading.quotes} onSelect={handleSelectQuoteFolder} t={t} themeColors={themeColors} />
      <Toast />
    </SafeAreaView>
  );
}

// --- Sub-components for Modals ---
const ContactPickerModal = ({ visible, onClose, contacts, isLoading, onSelect, t, themeColors }: ContactPickerModalProps) => {
    const s = modalStyles(themeColors);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredContacts = useMemo(() => {
      if (!searchQuery) return contacts;
      const lowercasedQuery = searchQuery.toLowerCase();
      return contacts.filter(contact =>
        (contact.display_name && contact.display_name.toLowerCase().includes(lowercasedQuery)) ||
        contact.contact_email.toLowerCase().includes(lowercasedQuery)
      );
    }, [contacts, searchQuery]);

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={s.modalOverlay}>
                <View style={s.modalContent}>
                    <Text style={s.modalHeader}>{t('editor_component.btn_add_from_contacts')}</Text>
                    <TouchableOpacity onPress={onClose} style={s.modalCloseButton}><Ionicons name="close" size={24} color={themeColors.text} /></TouchableOpacity>
                    <TextInput
                      style={s.searchInput}
                      placeholder={t('header.placeholder_search_contacts')}
                      placeholderTextColor={themeColors.icon}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {isLoading ? <ActivityIndicator size="large" color={themeColors.tint} style={s.loader} /> : (
                        <FlatList 
                          data={filteredContacts} 
                          keyExtractor={(item) => item.contact_email} 
                          renderItem={({ item }: { item: Contact }) => (
                            <TouchableOpacity style={s.modalItem} onPress={() => onSelect(item.contact_email)}>
                                <Text style={s.modalItemName}>{item.display_name || item.contact_email}</Text>
                                {item.display_name && <Text style={s.modalItemEmail}>{item.contact_email}</Text>}
                            </TouchableOpacity>
                          )}
                          ListEmptyComponent={<Text style={s.emptyListText}>{contacts.length === 0 ? t('editor_component.contacts_picker_no_users') : t('quote_picker_modal.no_results')}</Text>}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

const FilePickerModal = ({ visible, onClose, files, isLoading, onSelect, t, themeColors }: FilePickerModalProps) => {
    const s = modalStyles(themeColors);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFiles = useMemo(() => {
        if (!searchQuery) return files;
        const lowercasedQuery = searchQuery.toLowerCase();
        return files.filter(file =>
            file.original_filename.toLowerCase().includes(lowercasedQuery)
        );
    }, [files, searchQuery]);

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id); else newSelection.add(id);
        setSelectedIds(newSelection);
    };

    const handleConfirm = () => {
        const selectedFiles = files.filter(f => selectedIds.has(f.id));
        onSelect(selectedFiles);
        setSelectedIds(new Set());
    };
    
    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024; const dm = decimals < 0 ? 0 : decimals; const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={s.modalOverlay}>
                <View style={s.modalContent}>
                    <Text style={s.modalHeader}>{t('header.modal_file_picker_title')}</Text>
                    <TouchableOpacity onPress={onClose} style={s.modalCloseButton}><Ionicons name="close" size={24} color={themeColors.text} /></TouchableOpacity>
                    <TextInput
                      style={s.searchInput}
                      placeholder={t('header.placeholder_search_files')}
                      placeholderTextColor={themeColors.icon}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {isLoading ? <ActivityIndicator size="large" color={themeColors.tint} style={s.loader} /> : (
                        <>
                        <FlatList 
                          data={filteredFiles} 
                          keyExtractor={(item) => item.id} 
                          renderItem={({ item }: { item: AttachmentFile }) => (
                            <TouchableOpacity style={s.fileItemContainer} onPress={() => toggleSelection(item.id)}>
                                <Ionicons name={selectedIds.has(item.id) ? 'checkbox' : 'square-outline'} size={24} color={themeColors.tint} />
                                <View style={s.fileItemTextContainer}>
                                    <Text style={s.modalItemName} numberOfLines={1}>{item.original_filename}</Text>
                                    <Text style={s.modalItemEmail}>{formatBytes(item.filesize_bytes)}</Text>
                                </View>
                            </TouchableOpacity>
                          )}
                          ListEmptyComponent={<Text style={s.emptyListText}>{files.length === 0 ? t('editor_component.file_picker_no_files') : t('quote_picker_modal.no_results')}</Text>}
                        />
                        <View style={s.modalFooter}>
                            <TouchableOpacity style={[s.modalButton, { backgroundColor: themeColors.icon }]} onPress={onClose}><Text style={s.modalButtonText}>{t('header.btn_cancel')}</Text></TouchableOpacity>
                            <TouchableOpacity style={[s.modalButton, { backgroundColor: themeColors.tint }]} onPress={handleConfirm}><Text style={s.modalButtonText}>{t('header.btn_attach_selected')}</Text></TouchableOpacity>
                        </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const QuotePickerModal = ({ visible, onClose, groupedFolders, isLoading, onSelect, t, themeColors }: QuotePickerModalProps) => {
    const s = modalStyles(themeColors);
    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <View style={s.modalOverlay}>
                <View style={s.modalContent}>
                    <Text style={s.modalHeader}>{t('quote_picker_modal.title')}</Text>
                    <TouchableOpacity onPress={onClose} style={s.modalCloseButton}><Ionicons name="close" size={24} color={themeColors.text} /></TouchableOpacity>
                    {isLoading ? <ActivityIndicator size="large" color={themeColors.tint} style={s.loader} /> : groupedFolders.length > 0 ? (
                        <SectionList
                            sections={groupedFolders}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }: { item: QuoteFolder }) => (
                                <TouchableOpacity style={s.modalItem} onPress={() => onSelect(item)}>
                                    <Text style={s.modalItemName}>{item.folder_key}</Text>
                                    <Text style={s.modalItemEmail}>{item.description}</Text>
                                </TouchableOpacity>
                            )}
                            renderSectionHeader={({ section: { title } }) => (
                                <Text style={s.sectionHeader}>{title}</Text>
                            )}
                            stickySectionHeadersEnabled={false}
                        />
                    ) : <Text style={s.emptyListText}>{t('quote_picker_modal.no_results')}</Text>}
                </View>
            </View>
        </Modal>
    );
};

// --- StyleSheet Factory ---
const styles = (themeColors: Theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: themeColors.inputBorder, backgroundColor: themeColors.card },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: themeColors.text },
    sendButton: { backgroundColor: themeColors.tint, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    sendButtonDisabled: { backgroundColor: themeColors.icon },
    sendButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    inputContainer: { paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: themeColors.inputBorder, flexDirection: 'row', alignItems: 'center', minHeight: 50 },
    inputField: { flex: 1, color: themeColors.text, fontSize: 16, paddingVertical: 15 },
    contactButton: { padding: 5, marginLeft: 5 },
    recipientTextInput: { color: themeColors.text, fontSize: 16, paddingVertical: 5, flexGrow: 1, minWidth: 120 },
    pillScrollView: { alignItems: 'center', flexGrow: 1 },
    pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.tint, borderRadius: 15, paddingVertical: 4, paddingHorizontal: 10, marginRight: 5, marginVertical: 5 },
    pillText: { color: themeColors.background, marginRight: 5 },
    richEditorToolbar: { 
      backgroundColor: themeColors.background
    },
    toolbarContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: themeColors.background,
      borderTopWidth: 1,
      borderTopColor: themeColors.inputBorder,
    },
    counterText: {
      color: themeColors.icon,
      fontSize: 12,
      marginLeft: 10,
    },
    errorText: {
      color: 'red',
    },
    customActionsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 8,
    },
    toolbarButton: { paddingHorizontal: 12 },
    attachmentsContainer: { paddingHorizontal: 15, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: themeColors.inputBorder },
    attachmentPill: { flexDirection: 'row', backgroundColor: themeColors.background, borderWidth: 1, borderColor: themeColors.tint, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8, marginVertical: 5, alignItems: 'center' },
    attachmentText: { color: themeColors.tint, marginRight: 5, fontSize: 12 },
    attachmentRemoveIcon: { color: themeColors.tint },
});

const modalStyles = (themeColors: Theme) => StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { width: '90%', maxHeight: '80%', backgroundColor: themeColors.card, borderRadius: 10, padding: 15 },
    searchInput: {
      backgroundColor: themeColors.inputBackground,
      color: themeColors.text,
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 8,
      borderColor: themeColors.inputBorder,
      borderWidth: 1,
      marginBottom: 10,
    },
    modalHeader: { fontSize: 18, fontWeight: 'bold', color: themeColors.text, marginBottom: 10 },
    modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: themeColors.inputBorder },
    modalItemName: { fontSize: 16, color: themeColors.text },
    modalItemEmail: { fontSize: 14, color: themeColors.icon },
    modalCloseButton: { position: 'absolute', right: 15, top: 15 },
    emptyListText: { textAlign: 'center', color: themeColors.icon, marginVertical: 20, fontSize: 16 },
    fileItemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    fileItemTextContainer: { flex: 1, marginLeft: 15 },
    modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, borderTopWidth: 1, borderTopColor: themeColors.inputBorder, paddingTop: 10 },
    modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
    modalButtonText: { color: '#fff', fontWeight: 'bold' },
    loader: { marginVertical: 20 },
    sectionHeader: { fontSize: 16, fontWeight: 'bold', color: themeColors.text, backgroundColor: themeColors.background, paddingVertical: 8, paddingHorizontal: 5, marginTop: 10 },
});