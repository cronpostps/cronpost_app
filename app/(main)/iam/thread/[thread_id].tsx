// app/(main)/iam/thread/[thread_id].tsx
// Version: 3.2.0

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import RenderHTML from 'react-native-render-html';
import Toast from 'react-native-toast-message';
import api from '../../../../src/api/api';
import { Colors, Theme } from '../../../../src/constants/Colors';
import { useAuth } from '../../../../src/store/AuthContext';
import { useIamStore } from '../../../../src/store/iamStore';
import { useTheme } from '../../../../src/store/ThemeContext';
import { translateApiError } from '../../../../src/utils/errorTranslator';

interface MessageParty {
  id: string;
  user_name: string;
  email: string;
}

// --- StyleSheet Factory ---
const getStyles = (themeColors: Theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: themeColors.background, 
  },
  centered: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20,
    backgroundColor: themeColors.background,
  },
  errorText: { 
    color: 'red', 
    textAlign: 'center' 
  },
  // List Item Styles
  listItem: {
    backgroundColor: themeColors.card,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.inputBorder,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  senderText: {
    fontWeight: 'bold',
    color: themeColors.text,
    fontSize: 16,
  },
  dateText: {
    color: themeColors.icon,
    fontSize: 12,
  },
  subjectText: {
    color: themeColors.text,
    fontSize: 14,
    marginBottom: 5,
  },
  snippetText: {
    color: themeColors.icon,
    fontSize: 14,
  },
  // Detail View Styles
  detailContainer: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  detailContent: {
    padding: 15,
    flexGrow: 1,
  },
  detailHeader: {
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.inputBorder,
  },
  detailMeta: {
    fontSize: 14,
    color: themeColors.text,
    lineHeight: 22,
  },
  detailSubject: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.text,
    marginBottom: 10,
  },
  replyContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: themeColors.inputBorder,
    backgroundColor: themeColors.background,
  },
  replyButton: {
    backgroundColor: themeColors.tint,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  replyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10, // Giảm padding dọc một chút
    backgroundColor: themeColors.card,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.inputBorder,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 5, // Thêm padding để dễ bấm
  },
  backButtonText: {
    color: themeColors.tint,
    fontSize: 16,
    marginLeft: 5,
  },
});

export default function InAppMessageThreadScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { user } = useAuth();
  const { fetchUnreadCount, markAsRead } = useIamStore();

  const styles = useMemo(() => getStyles(themeColors), [themeColors]);

  const { thread_id, selected_message_id, all_receivers_json, all_message_ids_json } = useLocalSearchParams<{ thread_id: string, selected_message_id?: string, all_receivers_json?: string, all_message_ids_json?: string }>();

  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(selected_message_id || null);

  const recipientsForDisplay = useMemo(() => {
    if (all_receivers_json) {
      try {
        return JSON.parse(all_receivers_json);
      } catch (_e) {
        // Fallback in case of parsing error
      }
    }
    // Lấy người nhận từ tin nhắn đơn lẻ nếu không có danh sách được truyền vào
    const selectedMessage = messages.find(msg => msg.id === selectedMessageId);
    return selectedMessage ? [selectedMessage.receiver] : [];
  }, [all_receivers_json, messages, selectedMessageId]);

  useEffect(() => {
      const loadAndProcessMessage = async () => {
        if (!thread_id || !selected_message_id || !user) return;

        setIsLoading(true);
        setError(null);
        
        try {
          // Bước 1: Lấy chi tiết của tin nhắn được chọn
          const messageResponse = await api.get(`/api/messaging/thread/message/${selected_message_id}`);
          const selectedMessage = messageResponse.data;

          // Bước 2: Kiểm tra và đánh dấu đã đọc (Sửa lỗi)
          // Sử dụng selectedMessage.receiver?.id thay vì selectedMessage.receiver_id
          if (selectedMessage.receiver?.id === user.id && selectedMessage.read_at === null) {
            await api.post(`/api/messaging/${selected_message_id}/read`);
            markAsRead(selected_message_id);
            fetchUnreadCount();
          }
          
          // Bước 3: Tải toàn bộ cuộc trò chuyện để hiển thị
          const threadResponse = await api.get(`/api/messaging/threads/${thread_id}`);
          const sortedMessages = threadResponse.data.sort(
            (a: any, b: any) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
          );
          setMessages(sortedMessages);

        } catch (err) {
          setError(translateApiError(err));
        } finally {
          setIsLoading(false);
        }
      };

      loadAndProcessMessage();
    }, [thread_id, selected_message_id, user, fetchUnreadCount, markAsRead]);
  
  const handleReply = (messageToReply: any) => {
    if (!user) return;
    const replyRecipient = messageToReply.sender.email;
    const replySubject = messageToReply.subject?.startsWith(t('iam_page.label_reply_prefix')) 
      ? messageToReply.subject 
      : `${t('iam_page.label_reply_prefix')}: ${messageToReply.subject || ''}`;

    const formattedDate = new Date(messageToReply.sent_at).toLocaleString();
    const senderName = messageToReply.sender.user_name || messageToReply.sender.email;

    const replyContent = `<br><br><p>--- ${t('iam_page.label_reply_header', { datetime: formattedDate, sender: senderName })} ---</p><blockquote>${messageToReply.content}</blockquote>`;

    router.push({
      pathname: '/(main)/iam/compose',
      params: { recipients: replyRecipient, subject: replySubject, content: replyContent },
    });
  };

  const handleDelete = async () => {
    const idsToDelete = all_message_ids_json ? JSON.parse(all_message_ids_json) : (selectedMessageId ? [selectedMessageId] : []);
    if (idsToDelete.length === 0) return;

    const selectedMessage = messages.find(msg => msg.id === selectedMessageId);

    Alert.alert(
      t('contacts_page.confirm_delete_title'),
      t('iam_page.confirm_delete_multiple', { count: idsToDelete.length }),
      [
        { text: t('contacts_page.btn_cancel'), style: 'cancel' },
        {
          text: t('contacts_page.action_delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Gửi nhiều yêu cầu xóa song song
              await Promise.allSettled(
                idsToDelete.map((id: string) => api.delete(`/api/messaging/${id}`))
              );
              
              if (selectedMessage && selectedMessage.read_at === null) {
                fetchUnreadCount();
              }

              Toast.show({ type: 'success', text2: t('upload_page.success_delete') });
              router.replace('/(main)/iam'); // Quay về Inbox sau khi xóa
            } catch (err) {
              Alert.alert(t('errors.title_error'), translateApiError(err));
            }
          },
        },
      ]
    );
  };

  const renderMessageListItem = ({ item }: { item: any }) => {
    const isSentByMe = item.sender_id === user?.id;
    const otherParty = isSentByMe ? item.receiver : item.sender;
    const prefix = isSentByMe ? `${t('iam_page.label_to')}: ` : `${t('iam_page.label_from')}: `;

    return (
      <TouchableOpacity style={styles.listItem} onPress={() => setSelectedMessageId(item.id)}>
        <View style={styles.listItemHeader}>
          <Text style={styles.senderText} numberOfLines={1}>{prefix}{otherParty?.user_name || otherParty?.email}</Text>
          <Text style={styles.dateText}>{new Date(item.sent_at).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.subjectText}>{item.subject || t('iam_page.label_no_subject')}</Text>
        <Text style={styles.snippetText} numberOfLines={1}>{item.content.replace(/<[^>]+>/g, '')}</Text>
      </TouchableOpacity>
    );
  };
  
  const renderMessageDetailView = () => {
    const selectedMessage = messages.find(msg => msg.id === selectedMessageId);
    if (!selectedMessage) return null;

    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailTopBar}>
          <TouchableOpacity style={styles.backButtonContent} onPress={() => router.replace('/(main)/iam')}>
            <Ionicons name="arrow-back" size={24} color={themeColors.tint} />
            <Text style={styles.backButtonText}>{t('iam_page.btn_back_to', { folder: t('iam_page.tab_inbox') })}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={themeColors.tint} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.detailContent}>
          <Text style={styles.detailSubject}>{selectedMessage.subject || t('iam_page.label_no_subject')}</Text>
          <View style={styles.detailHeader}>
            <Text style={styles.detailMeta}><Text style={{fontWeight: 'bold'}}>{t('iam_page.label_from')}:</Text> {selectedMessage.sender.user_name} &lt;{selectedMessage.sender.email}&gt;</Text>
            <Text style={styles.detailMeta}>
              <Text style={{fontWeight: 'bold'}}>{t('iam_page.label_to')}:</Text> 
              {recipientsForDisplay.map((r: MessageParty) => {
                if (r?.user_name && r.user_name !== r.email) {
                  return `${r.user_name} <${r.email}>`;
                }
                return r?.email;
              }).join(', ')}
            </Text>
            <Text style={styles.detailMeta}><Text style={{fontWeight: 'bold'}}>{t('iam_page.label_sent')}:</Text> {new Date(selectedMessage.sent_at).toLocaleString()}</Text>
          </View>
          <RenderHTML
            contentWidth={width - 30}
            source={{ html: selectedMessage.content }}
            baseStyle={{ color: themeColors.text }}
          />
        </ScrollView>
        <View style={styles.replyContainer}>
          <TouchableOpacity style={styles.replyButton} onPress={() => handleReply(selectedMessage)}>
            <Text style={styles.replyButtonText}>{t('iam_page.btn_reply')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  if (isLoading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={themeColors.tint} /></View>;
  }

  if (error) {
    return <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>;
  }

  // Main render logic
  if (selectedMessageId) {
    return renderMessageDetailView();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessageListItem}
      />
    </View>
  );
}