// app/(main)/settings/sendingHistory.tsx
// Version 1.0.0

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

export default function SendingHistoryScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const themeColors = Colors[theme];

  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState('time');
  const [sortDir, setSortDir] = useState('desc');

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchHistory = useCallback(async (isInitial = false) => {
    if (isLoadingMore) return;
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const nextPage = isInitial ? 1 : page + 1;
      const response = await api.get(`/api/users/sending-history?page=${nextPage}&sort_by=${sortBy}&sort_dir=${sortDir}`);
      const { items, total_pages, current_page } = response.data;
      
      setHistory(prev => (isInitial ? items : [...prev, ...items]));
      setPage(current_page);
      setTotalPages(total_pages);
    } catch (error) {
      console.error(translateApiError(error));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [page, sortBy, sortDir, isLoadingMore]);

  useEffect(() => {
    fetchHistory(true);
  }, [sortBy, sortDir]);

  const handleOpenDetails = (item) => {
    const failures = new Map();
    if (item.status_details) {
      item.status_details.split(';').forEach(part => {
        if (!part) return;
        const [email, status, ...reasonParts] = part.split(':');
        const reason = reasonParts.join(':');
        if (status === 'failed' && email) {
          failures.set(email.trim(), reason.trim() || t('history_page.unknown_error'));
        }
      });
    }

    const allRecipients = new Set((item.receivers || '').split(', ').map(r => r.trim()).filter(r => r));
    const successList = Array.from(allRecipients).filter(r => !failures.has(r));

    setSelectedItem({ ...item, failures, successList });
    setDetailModalVisible(true);
  };

const getStatusStyle = (status) => {
    switch (status) {
      case 'success':
        return { backgroundColor: themeColors.success, color: '#0fecb5ff' };
      case 'partial':
        return { backgroundColor: themeColors.warning, color: '#ecde12ff' };
      case 'failed':
        return { backgroundColor: themeColors.danger, color: '#ee0808ff' };
      default:
        return { backgroundColor: themeColors.icon, color: '#ffffff' };
    }
};

  const renderItem = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    const date = new Date(item.sent_at);
    const formattedDate = date.toLocaleDateString(i18n.language, { year: 'numeric', month: '2-digit', day: '2-digit' });
    const formattedTime = date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity style={styles.itemContainer} onPress={() => handleOpenDetails(item)}>
        <View style={styles.itemHeader}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.message_title || t('history_page.untitled')}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
                <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
                    {t(`history_page.status_${item.status}`)}
                </Text>
            </View>
        </View>
        <Text style={styles.receiversText} numberOfLines={1}>{t('history_page.recipient_count', { count: item.receivers.split(',').length })}: {item.receivers}</Text>
        <View style={styles.itemFooter}>
            <Text style={styles.metaText}>{item.messenger_type} ・ {item.sending_method.replace(/_/g, ' ')} ・ {item.loop_progress}</Text>
            <Text style={styles.metaText}>{formattedDate} {formattedTime}</Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderListFooter = () => {
    if (!isLoadingMore) return null;
    return <ActivityIndicator style={{ marginVertical: 20 }} color={themeColors.tint} />;
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    emptyText: { color: themeColors.icon, fontSize: 16 },
    itemContainer: { backgroundColor: themeColors.inputBackground, padding: 15, marginHorizontal: 15, marginVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: themeColors.inputBorder },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    itemTitle: { fontSize: 16, fontWeight: 'bold', color: themeColors.text, flex: 1, marginRight: 10 },
    receiversText: { color: themeColors.icon, fontSize: 12, marginBottom: 10 },
    itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: themeColors.inputBorder, paddingTop: 10 },
    metaText: { color: themeColors.icon, fontSize: 12, textTransform: 'capitalize' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 70 },
    statusBadgeText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
    // Modal Styles
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { width: '90%', maxHeight: '80%', backgroundColor: themeColors.background, borderRadius: 10, padding: 20 },
    modalHeader: { fontSize: 18, fontWeight: 'bold', color: themeColors.text, marginBottom: 20 },
    detailSectionTitle: { fontSize: 16, fontWeight: 'bold', color: themeColors.text, marginTop: 15, marginBottom: 10 },
    recipientItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: themeColors.inputBorder },
    recipientEmail: { fontSize: 14, color: themeColors.text, fontWeight: '500' },
    recipientReason: { fontSize: 12, color: themeColors.danger, marginTop: 4 },
    successListContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    successBadge: { backgroundColor: themeColors.inputBorder, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, margin: 4, alignSelf: 'flex-start' },
    successEmail: { color: themeColors.text, fontSize: 12 },
  });

  if (isLoading && page === 1) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={themeColors.tint} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        onEndReached={() => {
          if (page < totalPages) fetchHistory();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={<View style={styles.emptyContainer}><Text style={styles.emptyText}>{t('history_page.empty_list')}</Text></View>}
        contentContainerStyle={{ paddingVertical: 8 }}
      />

      <Modal visible={detailModalVisible} transparent animationType="fade" onRequestClose={() => setDetailModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPressOut={() => setDetailModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalHeader}>{t('history_page.modal_title')}</Text>
            <ScrollView>
              {selectedItem?.failures?.size > 0 && (
                <View>
                  <Text style={styles.detailSectionTitle}>{t('history_page.modal_failed_header')} ({selectedItem.failures.size})</Text>
                  {Array.from(selectedItem.failures.entries()).map(([email, reason]) => (
                    <View key={email} style={styles.recipientItem}>
                      <Text style={styles.recipientEmail}>{email}</Text>
                      <Text style={styles.recipientReason}>{reason}</Text>
                    </View>
                  ))}
                </View>
              )}
              {selectedItem?.successList?.length > 0 && (
                 <View>
                    <Text style={styles.detailSectionTitle}>{t('history_page.modal_success_header')} ({selectedItem.successList.length})</Text>
                    <View style={styles.successListContainer}>
                      {selectedItem.successList.map(email => (
                        <View key={email} style={styles.successBadge}>
                          <Text style={styles.successEmail}>{email}</Text>
                        </View>
                      ))}
                    </View>
                 </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}