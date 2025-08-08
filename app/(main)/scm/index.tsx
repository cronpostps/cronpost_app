// app/(main)/scm/index.tsx
// Version: 3.1.0 (Integrated Custom Modal, Filters & Enhanced Display)

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { TFunction } from 'i18next';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../../../src/api/api';
import SendingMethodModal, { MethodOption } from '../../../src/components/SendingMethodModal';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';
dayjs.extend(relativeTime);

// --- Interfaces & Types ---
type SendingMethod = 'in_app_messaging' | 'cronpost_email' | 'user_email';
type ScmStatus = 'active' | 'inactive' | 'paused' | 'completed' | 'canceled' | 'failed';
type LoopType = 'minutes' | 'days' | 'day_of_week' | 'date_of_month' | 'date_of_year';
type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

interface Scm {
  id: string;
  title: string;
  receiver_addresses: { email: string }[];
  sending_method: SendingMethod;
  status: ScmStatus;
  schedule_type: 'loop' | 'unloop';
  next_send_at?: string;
  loop_type?: LoopType;
  loop_interval_minutes?: number;
  loop_interval_days?: number;
  loop_day_of_week?: DayOfWeek;
  loop_date_of_month?: number;
  loop_date_of_year?: string; // "MM-DD"
  loop_sending_time?: string; // "HH:mm"
  unloop_send_at?: string;
  repeat_number: number;
  current_repetition: number;
}

interface ScmStats {
  activeCount: number;
  activeLimit: number;
  storedCount: number;
  storedLimit: number;
}

// --- Helper Functions ---

const formatScheduleText = (item: Scm, t: TFunction): string => {
  const reps = `(${item.current_repetition}/${item.repeat_number} reps)`;
  if (item.status === 'inactive') return t('scm_page.schedule_not_scheduled');
  
  if (item.schedule_type === 'unloop') {
    if (!item.unloop_send_at) return t('scm_page.schedule_not_scheduled');
    return `${t('scm_page.label_onetime')}: ${dayjs(item.unloop_send_at).format('HH:mm DD/MM/YYYY')}`;
  }

  if (item.schedule_type === 'loop') {
    const time = item.loop_sending_time ? `at ${item.loop_sending_time}` : '';
    switch (item.loop_type) {
      case 'minutes':
        return `${t('scm_page.schedule_loop_minutes', { mins: item.loop_interval_minutes })} ${reps}`;
      case 'days':
        return `${t('scm_page.schedule_loop_days', { count: item.loop_interval_days, time })} ${reps}`;
      case 'day_of_week':
        const day = t(`ucm_page.day_${item.loop_day_of_week?.toLowerCase()}`);
        return `${t('scm_page.schedule_loop_day_of_week', { day, time })} ${reps}`;
      case 'date_of_month':
        return `${t('scm_page.schedule_loop_date_of_month', { date: item.loop_date_of_month, time })} ${reps}`;
      case 'date_of_year':
        const [month, date] = item.loop_date_of_year?.split('-') || ['', ''];
        const monthKey = dayjs().month(parseInt(month, 10) - 1).format('MMM').toLowerCase();
        const monthName = t(`ucm_page.month_${monthKey}`);
        return `${t('scm_page.schedule_loop_date_of_year', { day: date, month: monthName, time })} ${reps}`;
      default:
        return t('scm_page.schedule_not_scheduled');
    }
  }
  return t('scm_page.schedule_not_scheduled');
};

const CountdownTimer = ({ nextSendAt, style }: { nextSendAt: string; style: any }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(dayjs(nextSendAt).fromNow(true));
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = dayjs(nextSendAt).fromNow(true);
      if (dayjs(nextSendAt).isBefore(dayjs())) {
        setTimeLeft('Processing...');
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nextSendAt]);
  return <Text style={style}>{t('scm_page.label_next')}: {timeLeft}</Text>;
};

// --- Main Screen Component ---
export default function ScmScreen() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const styles = createStyles(Colors[theme], theme);

  // --- State ---
  const [scms, setScms] = useState<Scm[]>([]);
  const [stats, setStats] = useState<ScmStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ScmStatus | 'all'>('all');
  const [isMethodModalVisible, setIsMethodModalVisible] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<MethodOption[]>([]);

  const refreshUserRef = React.useRef(refreshUser);
  useEffect(() => { refreshUserRef.current = refreshUser; }, [refreshUser]);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    try {
      const [scmsResponse, userResponse] = await Promise.all([
        api.get('/api/scm/'),
        refreshUserRef.current(),
      ]);

      setScms(scmsResponse.data);
      if (userResponse) {
        setStats({
          activeCount: userResponse.max_active_messages - (userResponse.messages_remaining ?? 0),
          activeLimit: userResponse.max_active_messages,
          storedCount: userResponse.max_stored_messages - (userResponse.stored_messages_remaining ?? 0),
          storedLimit: userResponse.max_stored_messages,
        });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchData().finally(() => setIsLoading(false));
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  }, [fetchData]);

  // --- Filtering Logic ---
  const filteredScms = useMemo(() => {
    if (activeFilter === 'all') return scms;
    return scms.filter(scm => scm.status === activeFilter);
  }, [scms, activeFilter]);
  
  const filterOptions: { key: ScmStatus | 'all'; label: string }[] = [
      { key: 'all', label: t('scm_page.status_all') },
      { key: 'active', label: t('scm_page.status_active') },
      { key: 'inactive', label: t('scm_page.status_inactive') },
      { key: 'paused', label: t('scm_page.status_paused') },
      { key: 'completed', label: t('scm_page.status_completed') },
  ];

  // --- Handlers & Rendering ---
  const handleAction = async (scmId: string, action: 'pause' | 'resume' | 'cancel' | 'delete') => {
    if (isActionLoading) return;
    setIsActionLoading(scmId);

    try {
      if (action === 'delete') {
        Alert.alert(t('scm_page.confirm_delete'), '', [
          { text: t('btn_cancel'), style: 'cancel', onPress: () => setIsActionLoading(null) },
          {
            text: t('action_delete'), style: 'destructive',
            onPress: async () => {
              await api.delete(`/api/scm/${scmId}`);
              Toast.show({ type: 'success', text2: t('scm_page.success_deleted') });
              await fetchData();
            },
          },
        ]);
      } else {
        await api.post(`/api/scm/${scmId}/status`, { action });
        Toast.show({ type: 'success', text2: t('scm_page.success_action', { action: t(`action_${action}`) }) });
        await fetchData();
      }
    } catch (error) {
      Alert.alert(t('errors.title_error'), translateApiError(error));
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleEdit = (scmId: string) => {
    router.push({
        pathname: '/(main)/scm/compose',
        params: { scmId: scmId }
    });
  };

  const handleComposePress = async () => {
    let smtpConfig = null;
    try {
      const response = await api.get('/api/users/smtp-settings');
      if (response.status === 200 && response.data.is_active) {
        smtpConfig = response.data;
      }
    } catch (error: any) {
      if (error.response?.status !== 404) console.error("Failed to check SMTP status:", error);
    }

    const methods: MethodOption[] = [
      { key: 'cronpost_email', label: t('scm_page.method_cp_email') },
      { key: 'in_app_messaging', label: t('scm_page.method_iam') },
    ];

    if (smtpConfig) {
      methods.push({
        key: 'user_email',
        label: 'SMTP',
        email: smtpConfig.smtp_sender_email,
      });
    }
    setAvailableMethods(methods);
    setIsMethodModalVisible(true);
  };

// --- UI Rendering Helpers ---

  // Helper to get status badge style
  const getStatusStyle = (status: ScmStatus) => {
    switch (status) {
      case 'active': return { container: styles.statusActive, text: styles.statusTextLight };
      case 'paused': return { container: styles.statusPaused, text: styles.statusTextDark };
      case 'completed': return { container: styles.statusCompleted, text: styles.statusTextDark };
      case 'canceled': return { container: styles.statusCanceled, text: styles.statusTextLight };
      case 'failed': return { container: styles.statusFailed, text: styles.statusTextLight };
      default: return { container: styles.statusInactive, text: styles.statusTextLight };
    }
  };

  // Helper to render action buttons based on status
  const renderActionButtons = (item: Scm) => (
    <View style={styles.actionsContainer}>
      {item.status === 'active' && <>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(item.id, 'pause')}><Text style={styles.actionText}>{t('scm_page.action_pause')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(item.id, 'cancel')}><Text style={styles.actionText}>{t('scm_page.action_cancel')}</Text></TouchableOpacity>
      </>}
      {item.status === 'paused' && <>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(item.id, 'resume')}><Text style={styles.actionText}>{t('scm_page.action_resume')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(item.id, 'cancel')}><Text style={styles.actionText}>{t('scm_page.action_cancel')}</Text></TouchableOpacity>
      </>}
      {item.status === 'inactive' && <>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item.id)}><Text style={styles.actionText}>{t('scm_page.action_edit')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(item.id, 'delete')}><Text style={styles.actionText}>{t('scm_page.action_delete')}</Text></TouchableOpacity>
      </>}
      {(item.status === 'completed' || item.status === 'canceled' || item.status === 'failed') && <>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item.id)}><Text style={styles.actionText}>{t('scm_page.action_reschedule')}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleAction(item.id, 'delete')}><Text style={styles.actionText}>{t('scm_page.action_delete')}</Text></TouchableOpacity>
      </>}
    </View>
  );

  const getMethodShortText = (method: SendingMethod) => {
    switch (method) {
      case 'cronpost_email':
        return t('scm_page.method_cp_email_short');
      case 'in_app_messaging':
        return t('scm_page.method_in_app_short');
      case 'user_email':
        return t('scm_page.method_smtp_short');
      default:
        return method;
    }
  };

  const renderScmItem = ({ item }: { item: Scm }) => {
    const statusStyle = getStatusStyle(item.status);
    const recipientsText = item.receiver_addresses.map(r => r.email).join(', ');

    return (
      <View style={styles.itemContainer}>
        {isActionLoading === item.id && <View style={styles.itemLoadingOverlay}><ActivityIndicator color={Colors[theme].tint} /></View>}
        <View style={styles.itemHeader}>
          <View style={statusStyle.container}>
            <Text style={statusStyle.text}>{t(`scm_page.status_${item.status}`)}</Text>
          </View>
          <Text style={styles.methodText}>{getMethodShortText(item.sending_method)}</Text>
        </View>
        <View style={styles.itemBody}><Text style={styles.titleText} numberOfLines={1}>{item.title || t('scm_page.label_no_title')}</Text><Text style={styles.recipientText} numberOfLines={1}>{t('scm_page.label_to')}: {recipientsText}</Text></View>
        <View style={styles.scheduleContainer}>
            <Ionicons name="time-outline" size={16} color={styles.scheduleText.color} />
            <Text style={styles.scheduleText}>{formatScheduleText(item, t)}</Text>
        </View>
        {item.status === 'active' && item.next_send_at && <CountdownTimer nextSendAt={item.next_send_at} style={styles.countdownText} />}
        {renderActionButtons(item)}
      </View>
    );
  };
  
  if (isLoading) { return <View style={styles.centered}><ActivityIndicator size="large" color={Colors[theme].tint} /></View>; }

  return (
    <View style={styles.container}>
        <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
                {filterOptions.map(opt => (
                    <TouchableOpacity
                        key={opt.key}
                        style={[styles.filterButton, activeFilter === opt.key && styles.activeFilterButton]}
                        onPress={() => setActiveFilter(opt.key)}
                    >
                        <Text style={[styles.filterButtonText, activeFilter === opt.key && styles.activeFilterButtonText]}>{opt.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
        <FlatList
            data={filteredScms}
            renderItem={renderScmItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 180 }}
            ListEmptyComponent={<View style={styles.centered}><Ionicons name="mail-unread-outline" size={60} color={Colors[theme].icon} /><Text style={styles.emptyText}>{t('scm_page.empty_list')}</Text></View>}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors[theme].tint}/>}
        />
        {stats && ( <View style={styles.statsFooter}><Text style={styles.statsText}>{t('scm_page.label_active_messages')} {stats.activeCount}/{stats.activeLimit}</Text><Text style={styles.statsText}>{t('scm_page.label_stored_messages')} {stats.storedCount}/{stats.storedLimit}</Text></View>)}
        <TouchableOpacity style={styles.fab} onPress={handleComposePress}> 
            <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>

        <SendingMethodModal
            isVisible={isMethodModalVisible}
            methods={availableMethods}
            onClose={() => setIsMethodModalVisible(false)}
            onSelect={(method) => {
                setIsMethodModalVisible(false);
                router.push({
                    pathname: '/(main)/scm/compose',
                    params: { sendingMethod: method },
                });
            }}
        />
    </View>
  );
}

// --- Styles ---
const createStyles = (themeColors: any, theme: 'light' | 'dark') => StyleSheet.create({
  container: { flex: 1, backgroundColor: themeColors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
  emptyText: { marginTop: 15, fontSize: 16, color: themeColors.icon },
  filterContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.inputBorder,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: themeColors.inputBackground,
    marginRight: 10,
  },
  activeFilterButton: {
    backgroundColor: themeColors.tint,
  },
  filterButtonText: {
    color: themeColors.text,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  itemContainer: {
      backgroundColor: themeColors.card,
      borderRadius: 12,
      marginHorizontal: 15,
      marginVertical: 8,
      padding: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: theme === 'dark' ? 0.5 : 0.1,
      shadowRadius: 3,
      elevation: 3,
  },
  itemLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 10,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusContainer: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusTextLight: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  statusTextDark: { color: '#000000', fontWeight: 'bold', fontSize: 12 },
  statusActive: { backgroundColor: '#28a745' },
  statusPaused: { backgroundColor: '#ffc107' },
  statusCompleted: { backgroundColor: '#17a2b8' },
  statusCanceled: { backgroundColor: '#6c757d' },
  statusFailed: { backgroundColor: '#dc3545' },
  statusInactive: { backgroundColor: '#343a40' },
  methodText: { fontSize: 12, color: themeColors.icon, fontWeight: '500' },
  itemBody: { marginBottom: 12 },
  titleText: { fontSize: 18, fontWeight: 'bold', color: themeColors.text, marginBottom: 4 },
  recipientText: { fontSize: 14, color: themeColors.icon },
  scheduleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  scheduleText: { marginLeft: 6, fontSize: 13, color: themeColors.icon, flexShrink: 1 },
  countdownText: { fontSize: 13, color: themeColors.tint, fontWeight: 'bold', fontStyle: 'italic' },
  actionsContainer: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: themeColors.inputBorder, paddingTop: 10, marginTop: 10 },
  actionButton: { marginLeft: 15, paddingVertical: 5 },
  actionText: { color: themeColors.tint, fontWeight: 'bold', fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: themeColors.tint,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  statsFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingBottom: 25,
    backgroundColor: themeColors.card,
    borderTopWidth: 1,
    borderTopColor: themeColors.inputBorder,
  },
  statsText: {
    fontSize: 12,
    color: themeColors.icon,
  },
});