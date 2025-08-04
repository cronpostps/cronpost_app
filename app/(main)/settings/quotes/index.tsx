// app/(main)/settings/quotes/index.tsx
// Version 2.0.0 (Added Discover Public Folders feature)

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import api from '../../../../src/api/api';
import { Colors } from '../../../../src/constants/Colors';
import { useTheme } from '../../../../src/store/ThemeContext';
import { translateApiError } from '../../../../src/utils/errorTranslator';

export default function QuotesScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const router = useRouter();

  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State cho Modal Sửa/Thêm Folder
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [formState, setFormState] = useState({ key: '', description: '', isPublic: false });

  // State cho Modal Khám phá
  const [discoverModalVisible, setDiscoverModalVisible] = useState(false);
  const [discoverResults, setDiscoverResults] = useState([]);
  const [discoverSearchTerm, setDiscoverSearchTerm] = useState('');
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(false);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverTotalPages, setDiscoverTotalPages] = useState(1);

  const fetchFolders = useCallback(async () => {
    try {
      // Chỉ set loading cho lần tải đầu tiên
      if (sections.length === 0) setIsLoading(true);
      const response = await api.get('/api/quotes/folders');
      const { system_folders, user_folders, subscribed_folders } = response.data;

      const newSections = [
        { title: t('quotes_page.system_folders_header'), data: system_folders, type: 'system' },
        { title: t('quotes_page.user_folders_header'), data: user_folders, type: 'user' },
        { title: t('quotes_page.subscribed_folders_header'), data: subscribed_folders, type: 'subscribed' },
      ].filter(section => section.data && section.data.length > 0);

      setSections(newSections);
    } catch (error) {
      Alert.alert('Error', translateApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [t, sections.length]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // --- Logic cho Thêm/Sửa Folder ---
  const openFormModal = (mode: 'add' | 'edit', folder = null) => {
    setModalMode(mode);
    setSelectedFolder(folder);
    setFormState({
      key: folder?.folder_key || '',
      description: folder?.description || '',
      isPublic: folder?.is_public || false,
    });
    setFormModalVisible(true);
  };

  const handleModalSubmit = async () => {
    const url = modalMode === 'add' ? '/api/quotes/folders' : `/api/quotes/folders/${selectedFolder.id}`;
    const method = modalMode === 'add' ? 'POST' : 'PUT';
    const payload = { folder_key: formState.key, description: formState.description, is_public: formState.isPublic };

    try {
      await api({ method, url, data: payload });
      setFormModalVisible(false);
      await fetchFolders();
    } catch (error) {
      Alert.alert('Error', translateApiError(error));
    }
  };

  const handleDelete = (folder) => {
    Alert.alert(
      t('quotes_page.confirm_delete_folder_title'),
      t('quotes_page.confirm_delete_folder_body', { folder_key: folder.folder_key }),
      [
        { text: t('settings_page.btn_cancel'), style: 'cancel' },
        {
          text: t('settings_page.btn_confirm'),
          style: 'destructive',
          onPress: async () => {
            await api.delete(`/api/quotes/folders/${folder.id}`);
            await fetchFolders();
          },
        },
      ]
    );
  };

  const handleUnsubscribe = (folder) => {
    Alert.alert(
      t('quotes_page.confirm_remove_subscription_title'),
      t('quotes_page.confirm_remove_subscription_body', { folder_key: folder.folder_key }),
      [
        { text: t('settings_page.btn_cancel'), style: 'cancel' },
        {
          text: t('settings_page.btn_confirm'),
          style: 'destructive',
          onPress: async () => {
            await api.delete(`/api/quotes/folders/subscribe/${folder.id}`);
            await fetchFolders();
          },
        },
      ]
    );
  };
  
  // --- Logic cho Khám phá Folder ---
  const fetchDiscoveredFolders = async (searchTerm, page = 1, isNewSearch = false) => {
    if (isDiscoverLoading) return;
    setIsDiscoverLoading(true);
    try {
      const response = await api.get(`/api/quotes/folders/public?q=${searchTerm}&page=${page}&limit=15`);
      const { items, total_pages } = response.data;
      setDiscoverResults(isNewSearch ? items : [...discoverResults, ...items]);
      setDiscoverPage(page);
      setDiscoverTotalPages(total_pages);
    } catch (error) {
      Alert.alert('Error', translateApiError(error));
    } finally {
      setIsDiscoverLoading(false);
    }
  };

  const handleSearch = () => {
    fetchDiscoveredFolders(discoverSearchTerm, 1, true);
  };

  const handleSubscribe = async (folderToSubscribe) => {
    try {
      await api.post('/api/quotes/folders/subscribe', { folder_id: folderToSubscribe.id });
      // Cập nhật UI ngay lập tức để phản hồi
      setDiscoverResults(prevResults =>
        prevResults.map(folder =>
          folder.id === folderToSubscribe.id ? { ...folder, subscribed: true } : folder
        )
      );
      Toast.show({
        type: 'success',
        text1: t('quotes_page.success_subscribed', {folder_key: folderToSubscribe.folder_key}),
      });
      // Tải lại danh sách chính sau khi đăng ký thành công
      await fetchFolders();
    } catch(error) {
      Alert.alert('Error', translateApiError(error));
    }
  };

  // --- Render components ---
  const handleItemPress = (item, sectionType) => {
    const isOwner = sectionType === 'user';
    router.push({
      pathname: `/settings/quotes/${item.id}`,
      params: { isOwner: isOwner ? 'true' : 'false', folderKey: item.folder_key },
    });
  };

  const renderRightActions = (item, sectionType, close) => (
    <View style={styles.rightActionsContainer}>
      {sectionType === 'user' && (
        <TouchableOpacity style={[styles.rightAction, { backgroundColor: '#007bff' }]} onPress={() => { openFormModal('edit', item); close(); }}>
          <Ionicons name="pencil-outline" size={22} color="#fff" />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[styles.rightAction, { backgroundColor: '#dc3545' }]}
        onPress={() => {
          sectionType === 'user' ? handleDelete(item) : handleUnsubscribe(item);
          close();
        }}>
        <Ionicons name={sectionType === 'user' ? 'trash-outline' : 'remove-circle-outline'} size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item, section }) => {
      // Tái sử dụng JSX cho nội dung của một item
      const itemContent = (
        <>
          <Ionicons name="folder-outline" size={24} color={themeColors.tint} />
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemLabel}>{item.folder_key}</Text>
            <Text style={styles.itemDescription} numberOfLines={1}>{item.description || t('quotes_page.no_description', 'No description')}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.content_count}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={themeColors.icon} />
        </>
      );

      // System folders không có hành động vuốt
      if (section.type === 'system') {
        return (
          <TouchableOpacity style={styles.itemContainer} onPress={() => handleItemPress(item, section.type)}>
            {itemContent}
          </TouchableOpacity>
        );
      }

      // User và Subscribed folders có hành động vuốt
      let swipeableRef;
      return (
        <Swipeable
          ref={(ref) => (swipeableRef = ref)}
          renderRightActions={() => renderRightActions(item, section.type, () => swipeableRef.close())}
          overshootRight={false}
        >
          <TouchableOpacity style={styles.itemContainer} onPress={() => handleItemPress(item, section.type)}>
            {itemContent}
          </TouchableOpacity>
        </Swipeable>
      );
  };
  
  const renderListFooter = () => (
    <View style={styles.footerContainer}>
        <TouchableOpacity style={styles.discoverButton} onPress={() => {
            // Reset state trước khi mở
            setDiscoverResults([]);
            setDiscoverSearchTerm('');
            setDiscoverPage(1);
            setDiscoverTotalPages(1);
            setDiscoverModalVisible(true);
            // Tải 10 item đầu tiên
            fetchDiscoveredFolders('', 1, true);
        }}>
            <Ionicons name="search-circle-outline" size={22} color={themeColors.tint} />
            <Text style={[styles.discoverButtonText, {color: themeColors.tint}]}>{t('quotes_page.discover_header')}</Text>
        </TouchableOpacity>
    </View>
  );

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background },
    sectionHeader: { fontSize: 14, fontWeight: 'bold', color: themeColors.icon, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, textTransform: 'uppercase', backgroundColor: themeColors.background },
    itemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, backgroundColor: themeColors.inputBackground, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder },
    itemTextContainer: { flex: 1, marginLeft: 20 },
    itemLabel: { fontSize: 16, color: themeColors.text, fontWeight: '500' },
    itemDescription: { fontSize: 12, color: themeColors.icon, marginTop: 2 },
    badge: { backgroundColor: themeColors.icon, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 10 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    rightActionsContainer: { flexDirection: 'row' },
    rightAction: { justifyContent: 'center', alignItems: 'center', width: 75, height: '100%' },
    fab: { position: 'absolute', margin: 16, right: 20, bottom: 20, backgroundColor: themeColors.tint, borderRadius: 30, width: 60, height: 60, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
    footerContainer: { padding: 20, borderTopWidth: 1, borderTopColor: themeColors.inputBorder },
    discoverButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: themeColors.tint, backgroundColor: themeColors.inputBackground },
    discoverButtonText: { marginLeft: 10, fontSize: 16, fontWeight: 'bold' },
    // Styles for Modals
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    formModalContent: { width: '90%', backgroundColor: themeColors.background, borderRadius: 10, padding: 20 },
    modalHeader: { fontSize: 18, fontWeight: 'bold', color: themeColors.text, marginBottom: 20 },
    input: { height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text, backgroundColor: themeColors.inputBackground, marginBottom: 15 },
    switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
    modalButtonText: { color: '#fff', fontWeight: 'bold' },
    // Styles for Discover Modal
    discoverModalContent: { width: '95%', height: '85%', backgroundColor: themeColors.background, borderRadius: 10, padding: 15 },
    searchInputContainer: { flexDirection: 'row', marginBottom: 10 },
    searchInput: { flex: 1, height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text, backgroundColor: themeColors.inputBackground },
    searchButton: { marginLeft: 10, paddingHorizontal: 15, backgroundColor: themeColors.tint, justifyContent: 'center', borderRadius: 8 },
    discoverItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder },
    discoverItemInfo: { flex: 1, marginRight: 10 },
    discoverItemAuthor: { fontSize: 12, color: themeColors.icon, marginTop: 4 },
    subscribeButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5 },
    subscribeButtonText: { color: '#fff', fontWeight: 'bold' },
    discoverListFooter: { paddingVertical: 20, alignItems: 'center' },
  });

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={themeColors.tint} /></View>;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          stickySectionHeadersEnabled
          ListEmptyComponent={<View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50}}><Text style={{color: themeColors.icon}}>No folders found.</Text></View>}
          ListFooterComponent={renderListFooter}
          onRefresh={fetchFolders}
          refreshing={isLoading}
        />

        <TouchableOpacity style={styles.fab} onPress={() => openFormModal('add')}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>

        {/* Modal Thêm/Sửa Folder */}
        <Modal visible={formModalVisible} transparent={true} animationType="fade" onRequestClose={() => setFormModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.formModalContent}>
                    <Text style={styles.modalHeader}>{t(modalMode === 'add' ? 'quotes_page.modal_create_folder_title' : 'quotes_page.modal_edit_folder_title')}</Text>
                    <TextInput style={styles.input} placeholder={t('quotes_page.label_folder_key')} value={formState.key} onChangeText={text => setFormState({...formState, key: text})} />
                    <TextInput style={styles.input} placeholder={t('quotes_page.label_description')} value={formState.description} onChangeText={text => setFormState({...formState, description: text})} multiline />
                    <View style={styles.switchContainer}>
                        <Text style={{color: themeColors.text}}>{t('quotes_page.label_is_public')}</Text>
                        <Switch trackColor={{ false: "#767577", true: themeColors.tint }} thumbColor={"#f4f3f4"} onValueChange={val => setFormState({...formState, isPublic: val})} value={formState.isPublic} />
                    </View>
                    <View style={styles.modalActions}>
                        <TouchableOpacity style={[styles.modalButton, {backgroundColor: themeColors.icon}]} onPress={() => setFormModalVisible(false)}><Text style={styles.modalButtonText}>{t('quotes_page.btn_cancel')}</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.modalButton, {backgroundColor: themeColors.tint}]} onPress={handleModalSubmit}><Text style={styles.modalButtonText}>{t('quotes_page.btn_save')}</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        {/* Modal Khám phá */}
        <Modal visible={discoverModalVisible} transparent={true} animationType="slide" onRequestClose={() => setDiscoverModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.discoverModalContent}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                        <Text style={styles.modalHeader}>{t('quotes_page.discover_header')}</Text>
                        <TouchableOpacity onPress={() => setDiscoverModalVisible(false)}>
                            <Ionicons name="close-circle" size={28} color={themeColors.icon} />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.searchInputContainer}>
                        <TextInput style={styles.searchInput} placeholder={t('quotes_page.search_placeholder')} value={discoverSearchTerm} onChangeText={setDiscoverSearchTerm} onSubmitEditing={handleSearch} returnKeyType="search" />
                        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                            <Ionicons name="search" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={discoverResults}
                        keyExtractor={item => item.id}
                        renderItem={({item}) => (
                            <View style={styles.discoverItem}>
                                <View style={styles.discoverItemInfo}>
                                    <Text style={styles.itemLabel}>{item.folder_key}</Text>
                                    <Text style={styles.itemDescription}>{item.description}</Text>
                                    <Text style={styles.discoverItemAuthor}>{t('quotes_page.th_author')}: {item.author_key}</Text>
                                </View>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{item.content_count}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={[styles.subscribeButton, {backgroundColor: item.subscribed ? themeColors.success : themeColors.tint}]} 
                                    onPress={() => handleSubscribe(item)}
                                    disabled={item.subscribed}>
                                    <Text style={styles.subscribeButtonText}>{item.subscribed ? t('btn_added', "Added") : t('quotes_page.action_add')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        onEndReached={() => {
                            if (discoverPage < discoverTotalPages) {
                                fetchDiscoveredFolders(discoverSearchTerm, discoverPage + 1);
                            }
                        }}
                        onEndReachedThreshold={0.5}
                        ListEmptyComponent={<View style={styles.discoverListFooter}><Text style={{color: themeColors.icon}}>{t('quotes_page.discover_results_empty')}</Text></View>}
                        ListFooterComponent={isDiscoverLoading && <ActivityIndicator style={{marginVertical: 20}} color={themeColors.tint}/>}
                    />
                </View>
            </View>
        </Modal>

        <Toast />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}