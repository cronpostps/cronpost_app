// app/(main)/iam/index.tsx
// Version: 1.3.2

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useIamStore } from '../../../src/store/iamStore';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

interface MessageParty {
  id: string;
  user_name: string;
  email: string;
}

interface Message {
  id: string;
  thread_id: string;
  read_at: string | null;
  sender: MessageParty;
  receiver: MessageParty;
  subject: string;
  content: string;
  sent_at: string;
}

interface GroupedMessage extends Message {
  all_receivers: MessageParty[];
  all_message_ids: string[];
}
type IamTab = 'inbox' | 'sent';

export default function IamScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount, fetchUnreadCount, readMessageIds, markAsRead } = useIamStore();

  const [activeTab, setActiveTab] = useState<IamTab>('inbox');
  const [allMessages, setAllMessages] = useState<Message[]>([]); // <-- Mới: Lưu danh sách gốc
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]); // <-- Đổi tên từ messages
  const [searchQuery, setSearchQuery] = useState(''); // <-- Mới: Lưu từ khóa tìm kiếm
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  const groupSentMessages = (messages: Message[]): GroupedMessage[] => {
    const grouped = new Map<string, GroupedMessage>();

    messages.forEach(msg => {
      const groupKey = `${msg.sent_at}|${msg.subject}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          ...msg,
          all_receivers: [msg.receiver],
          all_message_ids: [msg.id],
        });
      } else {
        const existing = grouped.get(groupKey)!;
        existing.all_receivers.push(msg.receiver);
        existing.all_message_ids.push(msg.id);
      }
    });

    return Array.from(grouped.values());
  };

  const fetchMessages = useCallback(async () => {
    if (!user) return;
    // Don't set loading to true on refresh to avoid full-screen spinner
    if (!isRefreshing) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const response = await api.get(`/api/messaging/${activeTab}`);
      if (activeTab === 'sent') {
        const grouped = groupSentMessages(response.data);
        setAllMessages(grouped);
      } else {
        setAllMessages(response.data);
      }
    } catch (err) {
      console.error(`Failed to fetch ${activeTab}:`, err);
      setError(translateApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, user, isRefreshing]);

  useEffect(() => {
    if (searchQuery === '') {
      setFilteredMessages(allMessages);
    } else {
      const lowercasedQuery = searchQuery.toLowerCase();
      const filtered = allMessages.filter(message => {
        const otherParty = activeTab === 'inbox' ? message.sender : message.receiver;
        return (
          message.subject?.toLowerCase().includes(lowercasedQuery) ||
          message.content?.toLowerCase().includes(lowercasedQuery) ||
          otherParty?.user_name?.toLowerCase().includes(lowercasedQuery) ||
          otherParty?.email?.toLowerCase().includes(lowercasedQuery)
        );
      });
      setFilteredMessages(filtered);
    }
  }, [searchQuery, allMessages, activeTab]);

  useFocusEffect(
    useCallback(() => {
      // Hàm này sẽ chạy mỗi khi màn hình được focus (hiển thị)
      if (user) {
        fetchMessages();
        // Luôn cập nhật lại unread count khi vào màn hình Inbox
        if (activeTab === 'inbox') {
          fetchUnreadCount();
        }
      }
    }, [user, activeTab, fetchMessages, fetchUnreadCount])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchMessages();
    if (activeTab === 'inbox') {
      await fetchUnreadCount();
    }
    setIsRefreshing(false);
  }, [fetchMessages, fetchUnreadCount, activeTab]);

  const handleMessagePress = (item: Message) => {
    const params: any = {
      thread_id: item.thread_id,
      selected_message_id: item.id,
    };

    if (activeTab === 'sent' && (item as GroupedMessage).all_receivers) {
      params.all_receivers_json = JSON.stringify((item as GroupedMessage).all_receivers);
      // Gửi kèm danh sách ID của tất cả tin nhắn trong nhóm
      params.all_message_ids_json = JSON.stringify((item as GroupedMessage).all_message_ids);
    }
    
    router.push({
      pathname: '/(main)/iam/thread/[thread_id]',
      params,
    });
  };
  
  const handleCloseSwipeable = (id: string) => {
    // Placeholder to close other rows if needed in the future
  };

  const handleDeleteMessage = async (item: Message) => {
    Alert.alert(
      t('contacts_page.confirm_delete_title'),
      t('iam_page.confirm_delete_multiple', { count: 1 }),
      [
        { text: t('contacts_page.btn_cancel'), style: 'cancel' },
        {
          text: t('contacts_page.action_delete'),
          style: 'destructive',
          onPress: async () => {
            const originalMessages = [...allMessages];
            setAllMessages(prevMessages => prevMessages.filter(msg => msg.id !== item.id));

            try {
              await api.delete(`/api/messaging/${item.id}`);
              if (item.read_at === null) {
                fetchUnreadCount();
              }
              Toast.show({ type: 'success', text2: t('upload_page.success_delete') });
            } catch (err) {
              setAllMessages(originalMessages);
              Alert.alert(t('errors.title_error'), translateApiError(err));
            }
          },
        },
      ]
    );
  };

const toggleSelectMode = (item?: Message) => {
    if (isSelectMode) {
      // Exiting select mode
      setIsSelectMode(false);
      setSelectedMessageIds(new Set());
    } else if (item) {
      // Entering select mode
      setIsSelectMode(true);
      setSelectedMessageIds(new Set([item.id]));
    }
  };

  const handleSelectMessage = (item: Message) => {
    const newSelection = new Set(selectedMessageIds);
    if (newSelection.has(item.id)) {
      newSelection.delete(item.id);
    } else {
      newSelection.add(item.id);
    }
    setSelectedMessageIds(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedMessageIds.size === filteredMessages.length) {
      setSelectedMessageIds(new Set());
    } else {
      const allIds = filteredMessages.flatMap(m => (m as GroupedMessage).all_message_ids || [m.id]);
      setSelectedMessageIds(new Set(allIds));
    }
  };

const handleDeleteSelected = async () => {
    if (selectedMessageIds.size === 0) return;
    Alert.alert(
      t('contacts_page.confirm_delete_title'),
      t('iam_page.confirm_delete_multiple', { count: selectedMessageIds.size }),
      [
        { text: t('contacts_page.btn_cancel'), style: 'cancel' },
        {
          text: t('contacts_page.action_delete'),
          style: 'destructive',
          onPress: async () => {
            const originalMessages = [...allMessages];
            const idsToDelete = Array.from(selectedMessageIds);
            
            setAllMessages(prev => prev.filter(m => !idsToDelete.includes(m.id)));
            setIsSelectMode(false);
            setSelectedMessageIds(new Set());

            try {
              await Promise.allSettled(
                idsToDelete.map(id => api.delete(`/api/messaging/${id}`))
              );
              Toast.show({ type: 'success', text2: t('upload_page.success_delete') });
              fetchUnreadCount();
            } catch (err) {
              setAllMessages(originalMessages);
              Alert.alert(t('errors.title_error'), translateApiError(err));
            }
          },
        },
      ]
    );
  };

const handleMarkSelectedAsRead = async () => {
    if (selectedMessageIds.size === 0) return;
    const idsToMark = Array.from(selectedMessageIds);
    const originalMessages = [...allMessages];

    setAllMessages(prev => prev.map(msg => 
      idsToMark.includes(msg.id) ? { ...msg, read_at: new Date().toISOString() } : msg
    ));
    idsToMark.forEach(id => markAsRead(id));
    setIsSelectMode(false);
    setSelectedMessageIds(new Set());

    try {
      await Promise.allSettled(
        idsToMark.map(id => api.post(`/api/messaging/${id}/read`))
      );
      fetchUnreadCount();
    } catch (err) {
      setAllMessages(originalMessages); // Revert on failure
      Alert.alert(t('errors.title_error'), translateApiError(err));
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isClientSideRead = readMessageIds.has(item.id);
    const isUnread = activeTab === 'inbox' && item.read_at === null && !isClientSideRead;
    const otherParty =
          activeTab === 'inbox'
            ? item.sender?.user_name || item.sender?.email
            : (item as GroupedMessage).all_receivers?.map(r => r.user_name || r.email).join(', ');
    const isSelected = selectedMessageIds.has(item.id);

    const renderRightActions = (progress: any, dragX: any) => {
      const trans = dragX.interpolate({
        inputRange: [-80, 0],
        outputRange: [0, 80],
        extrapolate: 'clamp',
      });
      return (
        <TouchableOpacity onPress={() => handleDeleteMessage(item)}>
          <Animated.View style={[styles.deleteAction, { transform: [{ translateX: trans }] }]}>
            <Ionicons name="trash-outline" size={24} color="white" />
            <Text style={styles.deleteText}>{t('upload_page.btn_delete')}</Text>
          </Animated.View>
        </TouchableOpacity>
      );
    };

    return (
      <Swipeable 
        renderRightActions={renderRightActions} 
        onSwipeableWillOpen={() => handleCloseSwipeable(item.id)}
        enabled={!isSelectMode} // Vô hiệu hóa vuốt khi đang ở chế độ chọn
      >
        <TouchableOpacity
          style={[styles.messageItemContainer]}
          onPress={() => {
            if (isSelectMode) {
              handleSelectMessage(item);
            } else {
              handleMessagePress(item);
            }
          }}
          onLongPress={() => toggleSelectMode(item)}
          delayLongPress={200}
        >
          {isSelectMode && (
            <View style={styles.checkboxContainer}>
              <Ionicons
                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={isSelected ? themeColors.tint : themeColors.icon}
              />
            </View>
          )}
          <View style={styles.messageContentContainer}>
            <View style={styles.messageHeader}>
              <Text
                style={[
                  styles.messageParty,
                  isUnread && styles.messageUnreadText,
                ]}
                numberOfLines={1}>
                {otherParty || 'Unknown User'}
              </Text>
              <Text style={styles.messageDate}>
                {new Date(item.sent_at).toLocaleDateString()}
              </Text>
            </View>
            <Text
              style={[styles.messageSubject, isUnread && styles.messageUnreadText]}
              numberOfLines={1}>
              {item.subject || t('iam_page.label_no_subject')}
            </Text>
            <Text style={styles.messageContent} numberOfLines={1}>
              {item.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()}
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const TabButton = ({
    tabName,
    title,
    badgeCount = 0,
  }: {
    tabName: IamTab;
    title: string;
    badgeCount?: number;
  }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tabName && styles.activeTabButton,
      ]}
      onPress={() => {
        setActiveTab(tabName);
        setSearchQuery(''); // Xóa tìm kiếm khi chuyển tab
      }}>
      <Text
        style={[styles.tabText, activeTab === tabName && styles.activeTabText]}>
        {title}
      </Text>
      {badgeCount > 0 && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    tabContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      paddingVertical: 10,
      backgroundColor: themeColors.background,
    },
    tabButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      marginHorizontal: 5,
      flexDirection: 'row',
      alignItems: 'center',
    },
    activeTabButton: { backgroundColor: themeColors.tint },
    tabText: { color: themeColors.text, fontSize: 16 },
    activeTabText: { color: '#FFFFFF', fontWeight: 'bold' },
    badgeContainer: {
      backgroundColor: 'red',
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    searchContainer: {
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.inputBorder,
    },
    searchInput: {
      backgroundColor: themeColors.inputBackground,
      color: themeColors.text,
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 8,
      borderColor: themeColors.inputBorder,
      borderWidth: 1,
    },
    deleteAction: {
      backgroundColor: 'red',
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      height: '100%',
    },
    deleteText: {
      color: 'white',
      marginTop: 4,
      fontSize: 12,
    },
    contentArea: { flex: 1, justifyContent: 'center' },
    messageItemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: themeColors.inputBorder,
      backgroundColor: themeColors.card,
    },
    messageContentContainer: {
      flex: 1,
      padding: 15,
    },
    messageHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    messageParty: { color: themeColors.text, fontSize: 16, flex: 1 },
    messageDate: { color: themeColors.icon, fontSize: 12 },
    messageSubject: {
      color: themeColors.text,
      fontSize: 14,
      fontWeight: 'bold',
    },
    messageContent: { color: themeColors.icon, fontSize: 14, marginTop: 4 },
    messageUnreadText: { color: themeColors.tint, fontWeight: 'bold' },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyText: { color: themeColors.icon, fontSize: 16, marginTop: 10 },
    errorText: { color: 'red', textAlign: 'center', margin: 20 },
    checkboxContainer: {
      paddingLeft: 15,
    },
    selectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 10,
      backgroundColor: themeColors.card,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.inputBorder,
      height: 58, // Match tab container height
    },
    selectionCountText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themeColors.text,
    },
    headerActionButton: {
      padding: 8,
    },
    headerActionText: {
      color: themeColors.tint,
      fontSize: 16,
      fontWeight: 'bold',
    },
    selectionFooter: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: themeColors.inputBorder,
      backgroundColor: themeColors.card,
    },
    footerActionButton: {
      alignItems: 'center',
      padding: 10,
    },
    footerActionText: {
      color: themeColors.tint,
      marginTop: 4,
    },
    fab: {
      position: 'absolute',
      bottom: 25,
      right: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: themeColors.tint,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
    },
  });

  return (
    <View style={styles.container}>
      {isSelectMode ? (
        <View style={styles.selectionHeader}>
          <TouchableOpacity onPress={() => toggleSelectMode()}>
            <Ionicons name="close" size={28} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={styles.selectionCountText}>{selectedMessageIds.size}</Text>
          <TouchableOpacity style={styles.headerActionButton} onPress={handleSelectAll}>
            <Text style={styles.headerActionText}>
                {selectedMessageIds.size === filteredMessages.length ? t('iam_page.btn_deselect_all') : t('iam_page.btn_select_all')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.tabContainer}>
            <TabButton
              tabName="inbox"
              title={t('iam_page.tab_inbox')}
              badgeCount={unreadCount}
            />
            <TabButton tabName="sent" title={t('iam_page.tab_sent')} />
          </View>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('iam_page.placeholder_search')}
              placeholderTextColor={themeColors.icon}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </>
      )}

      <View style={styles.contentArea}>
        {isLoading ? (
          <ActivityIndicator size="large" color={themeColors.tint} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : filteredMessages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="mail-outline"
              size={50}
              color={themeColors.icon}
            />
            <Text style={styles.emptyText}>
              {t('iam_page.folder_empty', {
                folder: t(`iam_page.tab_${activeTab}`),
              })}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredMessages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessageItem}
            contentContainerStyle={{ paddingBottom: 120 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={themeColors.tint}
              />
            }
          />
        )}
      </View>

      {isSelectMode && (
        <View style={styles.selectionFooter}>
          <TouchableOpacity style={styles.footerActionButton} onPress={handleMarkSelectedAsRead}>
            <Ionicons name="mail-open-outline" size={24} color={themeColors.tint} />
            <Text style={styles.footerActionText}>{t('iam_page.mark_as_read')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerActionButton} onPress={handleDeleteSelected}>
            <Ionicons name="trash-outline" size={24} color={themeColors.tint} />
            <Text style={styles.footerActionText}>{t('iam_page.btn_delete_selected')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isSelectMode && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/(main)/iam/compose')}>
            <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      )}

    </View>
  );
}