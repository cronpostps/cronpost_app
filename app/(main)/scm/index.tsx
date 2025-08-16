// app/(main)/scm/index.tsx
// Version: 3.3.0

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

interface Attachment {
  id: string;
  original_filename: string;
  filesize_bytes: number;
}

// --- Interfaces & Types ---
type SendingMethod = 'in_app_messaging' | 'cronpost_email' | 'user_email';
type ScmStatus = 'active' | 'inactive' | 'paused' | 'completed' | 'canceled' | 'failed';
type LoopType = 'minutes' | 'days' | 'day_of_week' | 'date_of_month' | 'date_of_year' | 'date_of_lunar_year';
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
  loop_is_leap_month?: boolean;
  loop_sending_time?: string; // "HH:mm"
  unloop_send_at?: string;
  repeat_number: number;
  current_repetition: number;
  attachments: Attachment[];
  content: string;
  updated_at: string;
}

interface ScmStats {
  activeCount: number;
  activeLimit: number;
  storedCount: number;
  storedLimit: number;
}

// --- Helper Functions ---

const formatScheduleText = (item: Scm, t: TFunction, dateFormat: string): string => {
  const repsInfo = `(${item.current_repetition}/${item.repeat_number})`;

  if (item.status === 'inactive') return t('scm_page.schedule_not_scheduled');

  if (item.schedule_type === 'unloop') {
    if (!item.unloop_send_at) return t('scm_page.schedule_not_scheduled');
    // Sử dụng dateFormat được truyền vào
    return `${t('scm_page.label_onetime')}: ${dayjs(item.unloop_send_at).format(dateFormat)}`;
  }

  if (item.schedule_type === 'loop') {
    const time = item.loop_sending_time ? item.loop_sending_time.slice(0, 5) : '';
    switch (item.loop_type) {
      case 'minutes':
        return t('scm_page.schedule_loop_minutes', { mins: item.loop_interval_minutes, reps: repsInfo });
      case 'days':
        return t('scm_page.schedule_loop_days', { count: item.loop_interval_days, time, reps: repsInfo });
      case 'day_of_week':
        const day = t(`ucm_page.day_${item.loop_day_of_week?.toLowerCase()}`);
        return t('scm_page.schedule_loop_day_of_week', { day, time, reps: repsInfo });
      case 'date_of_month':
        return t('scm_page.schedule_loop_date_of_month', { date: item.loop_date_of_month, time, reps: repsInfo });
      case 'date_of_year':
        const [month, date] = item.loop_date_of_year?.split('-') || ['', ''];
        const monthName = t(`ucm_page.schedule.month_keys.${parseInt(month, 10)}`);
        return t('scm_page.schedule_loop_date_of_year', { day: date, month: monthName, time, reps: repsInfo });
      case 'date_of_lunar_year': {
        const [lunar_month, lunar_day] = item.loop_date_of_year?.split('-') || ['', ''];
        const leapIndicator = item.loop_is_leap_month ? ` ${t('scm_page.leap_month_indicator')}` : '';
        const dateString = `${lunar_day.padStart(2, '0')}/${lunar_month.padStart(2, '0')}${leapIndicator}`;
        return t('scm_page.schedule_loop_date_of_lunar_year', { date: dateString, time, reps: repsInfo });
      }
      default:
        return t('scm_page.schedule_not_scheduled');       
    }
  }
  return t('scm_page.schedule_not_scheduled');
};
const CountdownTimer = ({ nextSendAt, style }: { nextSendAt: string; style: any }) => {
  const { t } = useTranslation();
  // Quản lý 2 trạng thái thời gian: tương đối và chính xác
  const [relativeTime, setRelativeTime] = useState('');
  const [preciseTime, setPreciseTime] = useState('');

  useEffect(() => {
    // Hàm tính toán thời gian chính xác, tương tự web
    const formatPreciseTime = (distance: number) => {
      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      
      const parts = [];
      if (d > 0) parts.push(`${d}d`);
      parts.push(String(h).padStart(2, '0'));
      parts.push(String(m).padStart(2, '0'));
      parts.push(String(s).padStart(2, '0'));

      // Ghép h:m:s và thêm ngày (nếu có)
      const timePart = parts.slice(d > 0 ? 1 : 0).join(':');
      return d > 0 ? `${parts[0]} ${timePart}` : timePart;
    };

    const interval = setInterval(() => {
      const distance = dayjs(nextSendAt).diff(dayjs());

      if (distance < 0) {
        setRelativeTime('scm_page.status_processing');
        setPreciseTime('');
        clearInterval(interval);
      } else {
        // Cập nhật cả 2 trạng thái trong mỗi lần lặp
        setRelativeTime(dayjs(nextSendAt).fromNow(true));
        setPreciseTime(formatPreciseTime(distance));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [nextSendAt]);

  // Render cả 2 thông tin thời gian
  return (
      <Text style={style}>
          {t('scm_page.label_next')}: {relativeTime}
          {preciseTime ? ` (${preciseTime})` : ''}
      </Text>
  );
};

// --- Main Screen Component ---
export default function ScmScreen() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
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
  const userDateFormat = useMemo(() => {
      const format = user?.date_format || 'dd/mm/yyyy';
      // Chuyển đổi format của user (dd/mm/yyyy) sang format của dayjs (DD/MM/YYYY)
      return `${format.toUpperCase()} HH:mm`;
  }, [user?.date_format]);
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
    // 1. Lọc danh sách theo trạng thái được chọn
    const filtered = activeFilter === 'all'
      ? scms
      : scms.filter(scm => scm.status === activeFilter);
  
    // 2. Nếu bộ lọc là 'active', sắp xếp kết quả đã lọc
    if (activeFilter === 'active') {
      return filtered.sort((a, b) => {
        // Đẩy các SCM không có `next_send_at` xuống cuối
        if (!a.next_send_at) return 1;
        if (!b.next_send_at) return -1;
        
        // So sánh thời gian để đưa SCM sắp gửi lên đầu
        return new Date(a.next_send_at).getTime() - new Date(b.next_send_at).getTime();
      });
    }
  
    // 3. Với các bộ lọc khác, chỉ trả về danh sách đã lọc
    return filtered;
  }, [scms, activeFilter]);
  
  const filterOptions: { key: ScmStatus | 'all'; label: string }[] = [
      { key: 'all', label: t('scm_page.status_all') },
      { key: 'active', label: t('scm_page.status_active') },
      { key: 'inactive', label: t('scm_page.status_inactive') },
      { key: 'paused', label: t('scm_page.status_paused') },
      { key: 'canceled', label: t('scm_page.status_canceled') },
      { key: 'completed', label: t('scm_page.status_completed') },
  ];

  // --- Handlers & Rendering ---
  const handleAction = async (scmId: string, action: 'pause' | 'resume' | 'cancel' | 'delete') => {
    if (isActionLoading) return;
    setIsActionLoading(scmId);

    try {
      if (action === 'delete') {
        Alert.alert(t('scm_page.confirm_delete'), '', [
          { text: t('scm_page.btn_cancel'), style: 'cancel', onPress: () => setIsActionLoading(null) },
          {
            text: t('scm_page.action_delete'), style: 'destructive',
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

  const handleReschedule = (item: Scm) => {
    router.push({
      pathname: '/(main)/scm/schedule',
      params: {
        scmId: item.id,
        recipients: JSON.stringify(item.receiver_addresses.map(r => r.email)),
        subject: item.title,
        content: item.content,
        attachments: JSON.stringify(item.attachments),
        sendingMethod: item.sending_method,
      },
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
        label: t('scm_page.method_smtp'),
        email: smtpConfig.smtp_sender_email,
      });
    }
    setAvailableMethods(methods);
    setIsMethodModalVisible(true);
  };

  // --- UI Rendering Helpers ---
  const getMethodBadgeStyle = (method: SendingMethod) => {
    switch (method) {
      case 'in_app_messaging':
        return { container: styles.methodBadgePrimary, text: styles.methodBadgeTextLight };
      case 'cronpost_email':
        return { container: styles.methodBadgeInfo, text: styles.methodBadgeTextDark };
      case 'user_email':
        return { container: styles.methodBadgeWarning, text: styles.methodBadgeTextDark };
      default:
        return { container: {}, text: {} };
    }
  };
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
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonWarning]} onPress={() => handleAction(item.id, 'pause')}>
          <Text style={styles.actionButtonText}>{t('scm_page.action_pause')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={() => handleAction(item.id, 'cancel')}>
          <Text style={styles.actionButtonText}>{t('scm_page.action_cancel')}</Text>
        </TouchableOpacity>
      </>}
      {item.status === 'paused' && <>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonSuccess]} onPress={() => handleAction(item.id, 'resume')}>
          <Text style={styles.actionButtonText}>{t('scm_page.action_resume')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={() => handleAction(item.id, 'cancel')}>
          <Text style={styles.actionButtonText}>{t('scm_page.action_cancel')}</Text>
        </TouchableOpacity>
      </>}
      {item.status === 'inactive' && <>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={() => handleEdit(item.id)}>
          <Text style={styles.actionButtonText}>{t('scm_page.action_edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={() => handleAction(item.id, 'delete')}>
          <Text style={styles.actionButtonText}>{t('scm_page.action_delete')}</Text>
        </TouchableOpacity>
      </>}
      {(item.status === 'completed' || item.status === 'canceled' || item.status === 'failed') && <>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={() => handleReschedule(item)}>
          <Text style={styles.actionButtonText}>{t('scm_page.action_reschedule')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={() => handleAction(item.id, 'delete')}>
          <Text style={styles.actionButtonText}>{t('scm_page.action_delete')}</Text>
        </TouchableOpacity>
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
        
        {/* --- HEADER ĐÃ ĐƯỢC CẤU TRÚC LẠI --- */}
        <View style={styles.itemHeader}>
          {/* 1. Tiêu đề được chuyển lên đây */}
          <Text style={styles.titleText} numberOfLines={2}>{item.title || t('scm_page.label_no_title')}</Text>
          
          {/* 2. Nhóm các badge được đặt trong một View mới */}
          <View style={styles.badgeGroupContainer}>
            <View style={[styles.methodBadge, getMethodBadgeStyle(item.sending_method).container]}>
              <Text style={getMethodBadgeStyle(item.sending_method).text}>
                {getMethodShortText(item.sending_method)}
              </Text>
            </View>
            <View style={[statusStyle.container, { marginTop: 5 }]}>
              <Text style={statusStyle.text}>{t(`scm_page.status_${item.status}`)}</Text>
            </View>
          </View>
        </View>

        {/* --- BODY CHỈ CÒN LẠI NGƯỜI NHẬN --- */}
        <View style={styles.itemBody}>
          <Text style={styles.recipientText} numberOfLines={1}>{t('scm_page.label_to')}: {recipientsText}</Text>
        </View>

        {/* --- CÁC PHẦN CÒN LẠI GIỮ NGUYÊN --- */}
        <View style={styles.scheduleContainer}>
            <Ionicons name="time-outline" size={16} color={styles.scheduleText.color} />
            <Text style={styles.scheduleText}>{formatScheduleText(item, t, userDateFormat)}</Text>
        </View>
        {item.status === 'active' && item.next_send_at && <CountdownTimer nextSendAt={item.next_send_at} style={styles.countdownText} />}
        <View style={styles.footerContainer}>
          <Text style={styles.createdText}>
            ↻ {dayjs(item.updated_at).format(userDateFormat)}
          </Text>
          {renderActionButtons(item)}
        </View>
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
            contentContainerStyle={{ paddingBottom: 150 }}
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
  itemHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', // Quan trọng: để căn giữa tiêu đề và nhóm badge
    marginBottom: 8, // Giảm khoảng cách dưới header
  },
  statusContainer: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusTextLight: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  statusTextDark: { color: '#000000', fontWeight: 'bold', fontSize: 12 },
  statusActive: { backgroundColor: '#28a745' },
  statusPaused: { backgroundColor: '#ffc107' },
  statusCompleted: { backgroundColor: '#17a2b8' },
  statusCanceled: { backgroundColor: '#dc3545' },
  statusFailed: { backgroundColor: '#5c1049ff' },
  statusInactive: { backgroundColor: '#6c757d' },
  methodBadge: {
    paddingHorizontal: 0, // Đồng bộ với status badge
    paddingVertical: 0,    // Đồng bộ với status badge
    borderRadius: 0,      // Đồng bộ với status badge
    alignItems: 'center',
  },
  methodBadgeTextLight: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  methodBadgeTextDark: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  methodBadgePrimary: { // Dành cho In-App
    backgroundColor: '#0d6efd',
  },
  methodBadgeInfo: { // Dành cho CP-Email
    backgroundColor: '#0dcaf0',
  },
  methodBadgeWarning: { // Dành cho SMTP
    backgroundColor: '#ffc107',
  },
  methodText: { fontSize: 12, color: themeColors.icon, fontWeight: '500' },
  itemBody: { 
    // Không cần marginBottom nữa vì recipientText đã có
  },
  titleText: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: themeColors.text, 
    flex: 1, // Quan trọng: để tiêu đề chiếm hết không gian
    marginRight: 10, // Tạo khoảng cách với nhóm badge
  },
  recipientText: { 
    fontSize: 14, 
    color: themeColors.icon,
    marginBottom: 12, // Tạo khoảng cách với phần schedule bên dưới
  },
  badgeGroupContainer: {
    alignItems: 'flex-end', // Căn các badge về phía phải
  },
  scheduleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  scheduleText: { marginLeft: 6, fontSize: 13, color: themeColors.icon, flexShrink: 1 },
  countdownText: { fontSize: 13, color: themeColors.tint, fontWeight: 'bold', fontStyle: 'italic' },

  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  createdText: {
    fontSize: 12,
    color: themeColors.icon,
    fontStyle: 'italic',
  },
  actionsContainer: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 10,
  },
  
  actionButton: {
    borderRadius: 20, // Bo tròn để tạo hình viên thuốc
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#0d6efd', // Màu xanh dương cho Edit/Reschedule
  },
  actionButtonSuccess: {
    backgroundColor: '#198754', // Màu xanh lá cho Resume
  },
  actionButtonWarning: {
    backgroundColor: '#ffc107', // Màu vàng cho Pause
  },
  actionButtonDanger: {
    backgroundColor: '#dc3545', // Màu đỏ cho Cancel/Delete
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },

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