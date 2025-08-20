// app/(main)/settings/quotes/[folderId].tsx
// Version 2.0.1

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import api from '../../../../src/api/api';
import { Colors } from '../../../../src/constants/Colors';
import { useTheme } from '../../../../src/store/ThemeContext';
import { translateApiError } from '../../../../src/utils/errorTranslator';

interface ContentItem {
  id: string | number;
  content: string;
}

export default function QuoteFolderDetailScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const navigation = useNavigation();
  const router = useRouter();

  const { folderId, folderKey } = useLocalSearchParams();
  const isOwner = useLocalSearchParams().isOwner === 'true';

  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State cho Modal Sửa/Thêm Content
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [formContent, setFormContent] = useState('');

  const fetchContents = useCallback(async () => {
    try {
      const response = await api.get(`/api/quotes/folders/${folderId}`);
      setContents(response.data.contents || []);
    } catch (error) {
      Alert.alert('Error', translateApiError(error) || t('errors.fetch_folder_failed'));
      // Quay về nếu không tải được thư mục
      if (router.canGoBack()) {
        router.back();
      }
    } finally {
      setIsLoading(false);
    }
  }, [folderId, t, router]);

  useEffect(() => {
    // Set title ban đầu từ params và fetch data
    navigation.setOptions({ title: folderKey || t('quotes_page.header') });
    fetchContents();
  }, [fetchContents, navigation, folderKey, t]);

  const openFormModal = (mode: 'add' | 'edit', item: ContentItem | null = null) => {
    setModalMode(mode);
    setSelectedContent(item);
    setFormContent(item?.content || '');
    setModalVisible(true);
  };

  const handleModalSubmit = async () => {
    if (!formContent.trim()) return;

    const isAdding = modalMode === 'add';
    const url = isAdding ? `/api/quotes/folders/${folderId}/contents` : `/api/quotes/contents/${selectedContent?.id}`;
    const method = isAdding ? 'POST' : 'PUT';
    const payload = { content: formContent };

    try {
      await api({ method, url, data: payload });
      setModalVisible(false);
      await fetchContents(); // Tải lại danh sách sau khi thành công
    } catch (error) {
      Alert.alert('Error', translateApiError(error));
    }
  };

  const handleDelete = (contentId: ContentItem['id'], contentText: ContentItem['content']) => {
    Alert.alert(
      t('quotes_page.confirm_delete_content_title'),
      t('quotes_page.confirm_delete_content_body'),
      [
        { text: t('settings_page.btn_cancel'), style: 'cancel' },
        {
          text: t('settings_page.btn_confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/quotes/contents/${contentId}`);
              await fetchContents(); // Tải lại danh sách
            } catch (error) {
              Alert.alert('Error', translateApiError(error));
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (item: ContentItem, close: () => void) => (
    <View style={styles.rightActionsContainer}>
      <TouchableOpacity
        style={[styles.rightAction, { backgroundColor: themeColors.primary }]}
        onPress={() => {
          openFormModal('edit', item);
          close();
        }}>
        <Ionicons name="pencil-outline" size={24} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.rightAction, { backgroundColor: themeColors.danger }]}
        onPress={() => {
          handleDelete(item.id, item.content);
          close();
        }}>
        <Ionicons name="trash-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: ContentItem }) => {
    if (isOwner) {
      let swipeableRef: Swipeable | null = null;
      return (
        <Swipeable 
          ref={(ref: Swipeable | null) => { swipeableRef = ref; }} 
          renderRightActions={() => renderRightActions(item, () => swipeableRef?.close())} 
          overshootRight={false}
        >
          {/* ... */}
        </Swipeable>
      );
    }
    return (
      <View style={styles.itemContainer}>
        <Text style={styles.itemText}>{item.content}</Text>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    emptyText: { color: themeColors.icon, fontSize: 16 },
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 20,
      backgroundColor: themeColors.inputBackground,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: themeColors.inputBorder,
    },
    itemText: { flex: 1, color: themeColors.text, fontSize: 16, lineHeight: 22 },
    rightActionsContainer: { flexDirection: 'row' },
    rightAction: { justifyContent: 'center', alignItems: 'center', width: 75, height: '100%' },
    fab: {
      position: 'absolute',
      margin: 16,
      right: 20,
      bottom: 20,
      backgroundColor: themeColors.tint,
      borderRadius: 30,
      width: 60,
      height: 60,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    // Styles for Modal
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { width: '90%', backgroundColor: themeColors.background, borderRadius: 10, padding: 20 },
    modalHeader: { fontSize: 18, fontWeight: 'bold', color: themeColors.text, marginBottom: 20 },
    input: {
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 15,
      paddingVertical: 12,
      fontSize: 16,
      color: themeColors.text,
      backgroundColor: themeColors.inputBackground,
      marginBottom: 20,
      minHeight: 100,
      textAlignVertical: 'top'
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
    modalButtonText: { color: '#fff', fontWeight: 'bold' },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={contents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          onRefresh={fetchContents}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('quotes_page.contents_empty')}</Text>
            </View>
          }
          contentContainerStyle={{ flexGrow: 1 }}
        />

        {isOwner && (
          <TouchableOpacity style={styles.fab} onPress={() => openFormModal('add')}>
            <Ionicons name="add" size={30} color="#fff" />
          </TouchableOpacity>
        )}

        <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalHeader}>
                {t(modalMode === 'add' ? 'quotes_page.btn_add_content' : 'quotes_page.action_edit')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('quotes_page.form_add_content_placeholder')}
                value={formContent}
                onChangeText={setFormContent}
                multiline
                placeholderTextColor={themeColors.icon}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: themeColors.icon }]}
                  onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalButtonText}>{t('quotes_page.btn_cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: themeColors.tint }]}
                  onPress={handleModalSubmit}>
                  <Text style={styles.modalButtonText}>{t('quotes_page.btn_save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}