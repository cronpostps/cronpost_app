// app/(main)/ucm/index.tsx
// Version: 4.0.6

import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as LocalAuthentication from 'expo-local-authentication';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { TFunction } from 'i18next';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import api from '../../../src/api/api';
import PinModal, { PinModalRef } from '../../../src/components/PinModal';
import SendingMethodModal, { MethodOption } from '../../../src/components/SendingMethodModal';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

dayjs.extend(relativeTime);

// --- Interfaces & Types ---
export type UserAccountStatus = 'INS' | 'ANS_CLC' | 'ANS_WCT' | 'FNS';
export type SendingMethod = 'in_app_messaging' | 'cronpost_email' | 'user_email';
export type CLCType = 'every_day' | 'specific_days' | 'day_of_week' | 'date_of_month' | 'date_of_year' | 'specific_date_in_year';
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type WTCDurationUnit = 'hours' | 'minutes';
export type FMTriggerType = 'days_after_im_sent' | 'day_of_week' | 'date_of_month' | 'date_of_year' | 'specific_date';
export type FMStatus = 'draft' | 'pending' | 'completed' | 'canceled' | 'failed';

export interface Attachment {
  id: string;
  original_filename: string;
}

export interface UCMState {
  status: UserAccountStatus;
  countdownUntil?: string;
}

export interface IMSchedule {
  clc_type: CLCType;
  clc_prompt_time: string; // "HH:mm:ss"
  wct_duration_value: number;
  wct_duration_unit: WTCDurationUnit;
  clc_day_number_interval?: number;
  clc_day_of_week?: DayOfWeek;
  clc_date_of_month?: number;
  clc_date_of_year?: string; // "DD/MM"
  clc_specific_date?: string; // "YYYY-MM-DD"
}

export interface FMSchedule {
  trigger_type: FMTriggerType;
  sending_time_of_day: string; // "HH:mm:ss"
  repeat_number: number;
  days_after_im_value?: number;
  day_of_week_value?: DayOfWeek;
  date_of_month_value?: number;
  date_of_year_value?: string; // "DD/MM"
  specific_date_value?: string; // "YYYY-MM-DD"
}

export interface InitialMessage {
  id: string;
  recipients: string[];
  title?: string;
  content: string;
  sending_method: SendingMethod;
  attachments: Attachment[];
  schedule?: IMSchedule;
  updated_at?: string;
}

export interface FollowUpMessage {
  id: string;
  recipients: string[];
  title?: string;
  content: string;
  sending_method: SendingMethod;
  status: FMStatus;
  attachments: Attachment[];
  schedule?: FMSchedule;
  updated_at?: string;
}

interface FullUCMState {
  ucmState: UCMState;
  initialMessage: InitialMessage | null;
  followMessages: FollowUpMessage[];
}

// --- Helper Components & Functions ---
const CountdownTimer = ({ ucmState, themeColors }: { ucmState: UCMState, themeColors: any }) => {
    const { t } = useTranslation();
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!ucmState.countdownUntil) {
            setTimeLeft(t('ucm_page.im_section.countdown_not_running'));
            return;
        }

        const interval = setInterval(() => {
            const distance = dayjs(ucmState.countdownUntil).diff(dayjs());
            if (distance < 0) {
                setTimeLeft('Processing...');
                clearInterval(interval);
            } else {
                const d = Math.floor(distance / (1000 * 60 * 60 * 24));
                const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((distance % (1000 * 60)) / 1000);
                
                const parts = [];
                if (d > 0) parts.push(`${d}d`);
                parts.push(String(h).padStart(2, '0'));
                parts.push(String(m).padStart(2, '0'));
                parts.push(String(s).padStart(2, '0'));
                setTimeLeft(parts.join(':'));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [ucmState.countdownUntil, t]);

    let label = '';
    if (ucmState.status === 'ANS_CLC') label = t('ucm_page.im_section.countdown_clc');
    else if (ucmState.status === 'ANS_WCT') label = t('ucm_page.im_section.countdown_wct');
    
    return <Text style={{fontWeight: 'bold', color: themeColors.tint}}>{label} {timeLeft}</Text>;
};

const getIMScheduleText = (schedule: IMSchedule | undefined | null, t: TFunction): { schedule: string; wct: string } | null => {
    if (!schedule) return null;

    const promptTime = dayjs(`1970-01-01T${schedule.clc_prompt_time}`).format('HH:mm');
    const scheduleText = `${t(`ucm_page.schedule_form_im.option_${schedule.clc_type}`)} at ${promptTime}`;

    const wctUnit = t(`ucm_page.time_unit_${schedule.wct_duration_unit}`);
    const wctText = t('ucm_page.schedule_form_im.wct_duration_text', { value: schedule.wct_duration_value, unit: wctUnit });

    return { schedule: scheduleText, wct: wctText };
};

const getFMScheduleText = (schedule: FMSchedule | undefined | null, t: TFunction): string => {
    if (!schedule) return t('ucm_page.im_section.not_scheduled');
    const time = dayjs(`1970-01-01T${schedule.sending_time_of_day}`).format('HH:mm');
    let text = '';
    switch(schedule.trigger_type) {
        case 'days_after_im_sent': text = t('ucm_page.schedule.days_after', { count: schedule.days_after_im_value, time }); break;
        case 'day_of_week': text = t('ucm_page.schedule.day_of_week', { day: t(`ucm_page.day_${schedule.day_of_week_value?.toLowerCase()}`), time }); break;
        case 'date_of_month': text = t('ucm_page.schedule.date_of_month', { date: schedule.date_of_month_value, time }); break;
        case 'date_of_year': const [day, month] = schedule.date_of_year_value?.split('/') || []; text = t('ucm_page.schedule.date_of_year', { day, month: t(`ucm_page.month_${dayjs().month(parseInt(month)-1).format('MMM').toLowerCase()}`), time }); break;
        case 'specific_date': text = t('ucm_page.schedule.specific_date', { date: dayjs(schedule.specific_date_value).format('DD/MM/YYYY'), time }); break;
        default: text = t('ucm_page.im_section.not_scheduled');
    }
    if (schedule.repeat_number > 1) text += ` (${t('ucm_page.schedule.repeats', { count: schedule.repeat_number })})`;
    return text;
};

const getMethodShortText = (method: SendingMethod, t: TFunction) => {
    switch (method) {
      case 'cronpost_email': return t('scm_page.method_cp_email_short');
      case 'in_app_messaging': return t('scm_page.method_in_app_short');
      case 'user_email': return t('scm_page.method_smtp_short');
      default: return method;
    }
};

const getMethodBadgeStyle = (method: SendingMethod, styles: any) => {
    switch (method) {
      case 'in_app_messaging': return { container: styles.methodBadgePrimary, text: styles.methodBadgeTextLight };
      case 'cronpost_email': return { container: styles.methodBadgeInfo, text: styles.methodBadgeTextDark };
      case 'user_email': return { container: styles.methodBadgeWarning, text: styles.methodBadgeTextDark };
      default: return { container: {}, text: {} };
    }
};

// --- Main Component ---
export default function UcmScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const styles = createStyles(themeColors, theme);

  const [fullState, setFullState] = useState<FullUCMState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeFmFilter, setActiveFmFilter] = useState<FMStatus | 'all'>('all');
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const pinModalRef = useRef<PinModalRef>(null);
  const { user } = useAuth();
  const userDateFormat = useMemo(() => {
      const format = user?.date_format || 'dd/mm/yyyy';
      return `${format.toUpperCase()} HH:mm`;
  }, [user?.date_format]);
  const [isMethodModalVisible, setIsMethodModalVisible] = useState(false);
  const [imToEditId, setImToEditId] = useState<string | null>(null);
  const [methodOptions, setMethodOptions] = useState<MethodOption[]>([]);
  const { initialMessage, followMessages, ucmState } = fullState || {};
  
  const fetchData = useCallback(async (isRefresh = false) => {
      if (!isRefresh) setIsLoading(true);
      try {
        const response = await api.get<FullUCMState>('/api/ucm/full-state');
        setFullState(response.data);
      } catch (error: any) {
        if (error.response?.status === 403) {
          router.replace('/fns');
        } else {
          Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
        }
      } finally {
        if (!isRefresh) setIsLoading(false);
        setIsRefreshing(false);
      }
  }, [router, t]);

  useFocusEffect(useCallback(() => { setIsLoading(true); fetchData(); }, [fetchData]));
  const onRefresh = useCallback(() => { setIsRefreshing(true); fetchData(true); }, [fetchData]);

  const filteredFollowMessages = useMemo(() => {
    if (!followMessages) return [];
    if (activeFmFilter === 'all') return followMessages;
    return followMessages.filter(fm => fm.status === activeFmFilter);
  }, [followMessages, activeFmFilter]);

  const handleCreateNew = async () => {
    setImToEditId(null);
    try {
        // 1. Gọi đúng endpoint mà SCM đang gọi
        const response = await api.get('/api/users/smtp-settings');
        const smtpData = response.data;

        // 2. Xây dựng danh sách methods dựa trên kết quả API
        const methods: MethodOption[] = [
            { key: 'cronpost_email', label: t('scm_page.method_cp_email') },
            { key: 'in_app_messaging', label: t('scm_page.method_iam') },
        ];
        if (smtpData.is_active) {
            methods.push({ key: 'user_email', label: 'SMTP', email: smtpData.smtp_sender_email || '' });
        }

        // 3. Cập nhật state và hiển thị modal
        setMethodOptions(methods);
        setIsMethodModalVisible(true);
    } catch (error) {
        Alert.alert(t('errors.title_error'), translateApiError(error));
    }
  };

  const handleImEditPress = async (imId: string) => {
    setImToEditId(imId); // <-- Lưu ID của IM cần sửa
    try {
        const response = await api.get('/api/users/smtp-settings');
        const smtpData = response.data;
        const methods: MethodOption[] = [
            { key: 'cronpost_email', label: t('scm_page.method_cp_email') },
            { key: 'in_app_messaging', label: t('scm_page.method_iam') },
        ];
        if (smtpData.is_active) {
            methods.push({ key: 'user_email', label: 'SMTP', email: smtpData.smtp_sender_email || '' });
        }
        setMethodOptions(methods);
        setIsMethodModalVisible(true);
    } catch (error) {
        Alert.alert(t('errors.title_error'), translateApiError(error));
    }
  }; 

  const handleMethodSelect = async (method: 'cronpost_email' | 'in_app_messaging' | 'user_email') => {
      setIsMethodModalVisible(false);

      if (imToEditId) {
          // --- Logic cập nhật phương thức cho IM ---
          setActionLoading('im_action');
          try {
              // Gọi API chuyên dụng để thay đổi phương thức gửi
              await api.put('/api/ucm/im/method', { sending_method: method });
              Toast.show({
                  type: 'success',
                  text2: t('ucm_page.prompts.method_update_success')
              });
              // Sau khi cập nhật thành công, điều hướng đến trang soạn thảo
              router.push({
                  pathname: '/(main)/ucm/compose',
                  params: { messageType: 'IM', ucmId: imToEditId }
              });
          } catch (error) {
              Alert.alert(t('errors.title_error'), translateApiError(error));
          } finally {
              setActionLoading(null);
              setImToEditId(null); // Reset ID sau khi hoàn tất
          }
      } else {
          // --- Logic tạo mới (giữ nguyên) ---
          const messageType = initialMessage ? 'FM' : 'IM';
          router.push({
              pathname: '/(main)/ucm/compose',
              params: { messageType, sendingMethod: method }
          });
      }
  };

  const handleEdit = (messageType: 'IM' | 'FM', id: string) => {
    router.push({ pathname: '/(main)/ucm/compose', params: { messageType, ucmId: id } });
  };
  
  const handleIMAction = async (action: 'stop' | 'activate' | 'delete' | 'check-in') => {
      const confirmText = t(`ucm_page.prompts.confirm_im_${action.replace('-', '')}`);
      Alert.alert(t('confirm_modal.default_title'), confirmText, [
          { text: t('confirm_modal.btn_cancel'), style: 'cancel' },
          { text: t('confirm_modal.btn_confirm'), onPress: async () => {
              setActionLoading('im_action');
              try {
                  const endpoint = action === 'delete' ? '/api/ucm/im' : `/api/ucm/im/${action}`;
                  const method = action === 'delete' ? 'DELETE' : 'POST';
                  await api.request({ url: endpoint, method, data: {} });
                  Toast.show({ type: 'success', text2: t('ucm_page.prompts.action_success', { action }) });
                  await fetchData(true);
              } catch (error) { Alert.alert(t('errors.title_error'), translateApiError(error)); } finally { setActionLoading(null); }
          }}
      ]);
  };

  const handleCheckIn = async () => {
    if (!user) return;

    const BIOMETRICS_KEY = `biometrics_enabled_for_${user.id}`;
    const isBiometricsEnabled = await SecureStore.getItemAsync(BIOMETRICS_KEY);

    // Trường hợp 1: Sinh trắc học được bật và người dùng có mã PIN
    if (isBiometricsEnabled === 'true' && user.has_pin) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('biometrics.prompt_message'),
      });

      if (result.success) {
        // Nếu thành công, thực hiện check-in ngay lập tức (không cần PIN)
        await performCheckIn(null);
      } else {
        // Nếu thất bại hoặc bị hủy, quay về phương án dự phòng là mã PIN
        setIsPinModalVisible(true);
      }
    // Trường hợp 2: Sinh trắc học không bật, nhưng yêu cầu PIN cho mọi hành động
    } else if (user.use_pin_for_all_actions) {
      setIsPinModalVisible(true);
    // Trường hợp 3: Không có bảo mật đặc biệt, chỉ cần xác nhận
    } else {
      Alert.alert(t('confirm_modal.default_title'), t('ucm_page.prompts.confirm_im_checkin'), [
          { text: t('confirm_modal.btn_cancel'), style: 'cancel' },
          { text: t('confirm_modal.btn_confirm'), onPress: () => performCheckIn(null) }
      ]);
    }
  };

  const performCheckIn = async (pinCode: string | null) => {
      setActionLoading('im_action');
      try {
          await api.post('/api/ucm/check-in', { pin_code: pinCode });
          Toast.show({ type: 'success', text2: t('ucm_page.prompts.checkin_success') });
          await fetchData(true);
      } catch (error) {
          Alert.alert(t('errors.title_error'), translateApiError(error));
          pinModalRef.current?.resetPin();
      } finally {
          setActionLoading(null);
          setIsPinModalVisible(false);
      }
  };
  
  const handleFMAction = async (fmId: string, action: 'delete' | 'cancel') => {
    const confirmText = t(`ucm_page.prompts.confirm_fm_${action}`);
     Alert.alert(t('confirm_modal.default_title'), confirmText, [
          { text: t('confirm_modal.btn_cancel'), style: 'cancel' },
          { text: t('confirm_modal.btn_confirm'), onPress: async () => {
              setActionLoading(fmId);
              try {
                  const endpoint = action === 'delete' ? `/api/ucm/fm/${fmId}` : `/api/ucm/fm/${fmId}/cancel`;
                  const method = action === 'delete' ? 'DELETE' : 'POST';
                  await api.request({ url: endpoint, method });
                  Toast.show({ type: 'success', text2: t('ucm_page.prompts.fm_delete_success') });
                  await fetchData(true);
              } catch (error) { Alert.alert(t('errors.title_error'), translateApiError(error)); } finally { setActionLoading(null); }
          }}
      ]);
  };
  
  const renderImActions = () => {
    if (!ucmState) return null;
    return (
        <View style={styles.actionsContainer}>
            {ucmState.status === 'INS' && <>
                <TouchableOpacity style={[styles.actionButton, styles.actionButtonSuccess]} onPress={() => handleIMAction('activate')}><Text style={styles.actionButtonText}>{t('ucm_page.im_section.btn_activate')}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={() => handleIMAction('delete')}><Text style={styles.actionButtonText}>{t('ucm_page.im_section.btn_delete')}</Text></TouchableOpacity>
            </>}
            {(ucmState.status === 'ANS_CLC' || ucmState.status === 'ANS_WCT') && <>
                <TouchableOpacity style={[styles.actionButton, styles.actionButtonWarning]} onPress={() => handleIMAction('stop')}><Text style={styles.actionButtonText}>{t('ucm_page.im_section.btn_stop')}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.actionButtonSuccess, ucmState.status !== 'ANS_WCT' && styles.disabledButton]} onPress={handleCheckIn} disabled={ucmState.status !== 'ANS_WCT'}><Text style={styles.actionButtonText}>{t('ucm_page.im_section.btn_checkin')}</Text></TouchableOpacity>
            </>}
        </View>
    );
  };
  
  const renderNoImView = () => ( <View style={styles.centered}><Ionicons name="shield-checkmark-outline" size={60} color={themeColors.icon} /><Text style={styles.noImHeader}>{t('ucm_page.no_im_header')}</Text><Text style={styles.noImText}>{t('ucm_page.no_im_text')}</Text></View> );

const renderImCard = () => {
    const statusKeyMap: Record<UserAccountStatus, string> = {
      INS: 'inactive', ANS_CLC: 'active', ANS_WCT: 'wct', FNS: 'fns',
    };
    const statusKey = ucmState ? statusKeyMap[ucmState.status] : 'inactive';
    const methodStyle = getMethodBadgeStyle(initialMessage!.sending_method, styles);
    const scheduleInfo = getIMScheduleText(initialMessage?.schedule, t);

    return (
      <View style={styles.card}>
          {actionLoading === 'im_action' && <View style={styles.loadingOverlay}><ActivityIndicator color={themeColors.tint}/></View>}

          <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {initialMessage?.title || t('ucm_page.im_section.no_title')}
              </Text>
              <View style={styles.badgeGroupContainer}>
                  <View style={[styles.methodBadge, methodStyle.container]}>
                      <Text style={methodStyle.text}>{getMethodShortText(initialMessage!.sending_method, t)}</Text>
                  </View>
                  {ucmState && 
                    <View style={[styles.statusBadge, styles[`status${ucmState.status}`], { marginTop: 5 }]}>
                      <Text style={styles.statusBadgeText}>{t(`ucm_page.im_section.status_${statusKey}`)}</Text>
                    </View>
                  }
              </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.recipientText} numberOfLines={1}>
              {t('ucm_page.im_section.label_to')}: {initialMessage?.recipients.join(', ')}
            </Text>
          </View>

          <View style={styles.scheduleContainer}>
            <View style={{ flex: 1, marginRight: 8 }}>
              {scheduleInfo ? (
                <>
                  <View style={styles.scheduleRow}>
                    <Ionicons name="time-outline" size={16} color={themeColors.icon} />
                    <Text style={styles.scheduleText} numberOfLines={1}>{scheduleInfo.schedule}</Text>
                  </View>
                  <View style={styles.scheduleRow}>
                    <Ionicons name="hourglass" size={16} color={themeColors.icon} />
                    <Text style={styles.scheduleText} numberOfLines={1}>{scheduleInfo.wct}</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.scheduleText}>{t('ucm_page.im_section.not_scheduled')}</Text>
              )}
            </View>
            <TouchableOpacity onPress={() => handleImEditPress(initialMessage!.id)} disabled={ucmState?.status === 'ANS_WCT'}>
                <Ionicons name="pencil" size={30} color={ucmState?.status === 'ANS_WCT' ? themeColors.icon : themeColors.tint} />
            </TouchableOpacity>
          </View>

          <View style={styles.countdownContainer}>
             {ucmState && ucmState.status !== 'INS' && <CountdownTimer ucmState={ucmState} themeColors={themeColors} />}
          </View>
          <View style={styles.cardFooter}>
              <Text style={styles.updatedAtText}>
                {initialMessage?.updated_at ? `↻ ${dayjs(initialMessage.updated_at).format(userDateFormat)}` : ''}
              </Text>
              {renderImActions()}
          </View>
      </View>
    );
  }

  const renderFmItem = ({ item }: { item: FollowUpMessage }) => {
    const methodStyle = getMethodBadgeStyle(item.sending_method, styles);
    return (
        <View style={styles.card}>
            {actionLoading === item.id && <View style={styles.loadingOverlay}><ActivityIndicator color={themeColors.tint}/></View>}
            
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title || t('ucm_page.fm_section.no_title')}</Text>
                <View style={styles.badgeGroupContainer}>
                    <View style={[styles.methodBadge, methodStyle.container]}>
                      <Text style={methodStyle.text}>{getMethodShortText(item.sending_method, t)}</Text>
                    </View>
                    <View style={[styles.statusBadge, styles[`fmStatus${item.status}`], {marginTop: 5}]}>
                        <Text style={styles.statusBadgeText}>{t(`ucm_page.fm_section.status_${item.status}`)}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.cardBody}>
                <Text style={styles.recipientText} numberOfLines={1}>{t('ucm_page.fm_section.label_to')}: {item.recipients.join(', ')}</Text>
            </View>
            <View style={styles.scheduleContainer}>
                <Ionicons name="time-outline" size={16} color={themeColors.icon} />
                <Text style={styles.scheduleText}>{getFMScheduleText(item.schedule, t)}</Text>
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.updatedAtText}>
                    {item.updated_at ? `↻ ${dayjs(item.updated_at).format(userDateFormat)}` : ''}
                </Text>
                <View style={styles.actionsContainer}>
                    {(item.status === 'draft' || item.status === 'pending') && <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={() => handleEdit('FM', item.id)}><Text style={styles.actionButtonText}>{t('ucm_page.fm_section.btn_edit')}</Text></TouchableOpacity>}
                    {item.status === 'pending' && <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={() => handleFMAction(item.id, 'cancel')}><Text style={styles.actionButtonText}>{t('ucm_page.fm_section.btn_cancel')}</Text></TouchableOpacity>}
                    {item.status === 'draft' && <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={() => handleFMAction(item.id, 'delete')}><Text style={styles.actionButtonText}>{t('ucm_page.fm_section.btn_delete')}</Text></TouchableOpacity>}
                    {(item.status === 'completed' || item.status === 'canceled' || item.status === 'failed') && <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={() => handleEdit('FM', item.id)}><Text style={styles.actionButtonText}>{t('ucm_page.fm_section.btn_reschedule')}</Text></TouchableOpacity>}
                </View>
            </View>
        </View>
    );
  }

  const filterOptions: { key: FMStatus | 'all'; label: string }[] = useMemo(() => [
    { key: 'all', label: t('scm_page.status_all') },
    { key: 'pending', label: t('ucm_page.fm_section.status_pending') },
    { key: 'draft', label: t('ucm_page.fm_section.status_draft') },
    { key: 'completed', label: t('ucm_page.fm_section.status_completed') },
    { key: 'canceled', label: t('ucm_page.fm_section.status_canceled') },
    { key: 'failed', label: t('ucm_page.fm_section.status_failed') },
  ], [t]);

  if (isLoading) return <View style={[styles.container, styles.centered]}><ActivityIndicator size="large" color={themeColors.tint} /></View>;

  return (
    <SafeAreaView style={styles.container}>
        <FlatList
            data={filteredFollowMessages}
            renderItem={renderFmItem}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
                <>
                {!initialMessage ? renderNoImView() : (
                    <>
                        {/* Tiêu đề section được đưa ra ngoài card */}
                        <Text style={styles.sectionTitle}>{t('ucm_page.im_section.title')}</Text>
                        {renderImCard()}
                    </>
                )}
                {initialMessage && <Text style={styles.sectionTitle}>{t('ucm_page.fm_section.title')}</Text>}
                {initialMessage && 
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
                        {filterOptions.map(opt => (
                            <TouchableOpacity key={opt.key} style={[styles.filterButton, activeFmFilter === opt.key && styles.activeFilterButton]} onPress={() => setActiveFmFilter(opt.key)}>
                                <Text style={[styles.filterButtonText, activeFmFilter === opt.key && styles.activeFilterButtonText]}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                }
                </>
            }
            ListEmptyComponent={initialMessage ? <View style={styles.centered}><Text style={styles.noImText}>{t('ucm_page.fm_section.empty_list')}</Text></View> : null}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={themeColors.tint} />}
            contentContainerStyle={{ paddingBottom: 100 }}
        />
        <TouchableOpacity style={styles.fab} onPress={handleCreateNew}><Ionicons name="add" size={32} color="white" /></TouchableOpacity>
        <PinModal
            ref={pinModalRef}
            isVisible={isPinModalVisible}
            onClose={() => setIsPinModalVisible(false)}
            onSubmit={(pin) => performCheckIn(pin)}
            promptText={t('ucm_page.prompts.pin_for_checkin')}
        />
        <SendingMethodModal
            isVisible={isMethodModalVisible}
            methods={methodOptions}
            onClose={() => setIsMethodModalVisible(false)}
            onSelect={handleMethodSelect}
        />
    </SafeAreaView>
  );
}

const createStyles = (themeColors: any, theme: 'light' | 'dark') => StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background, },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    noImHeader: { fontSize: 18, fontWeight: 'bold', color: themeColors.text, marginTop: 15, marginBottom: 5, textAlign: 'center' },
    noImText: { fontSize: 14, color: themeColors.icon, textAlign: 'center', marginBottom: 20 },
    card: { backgroundColor: themeColors.card, borderRadius: 12, marginHorizontal: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: theme === 'dark' ? 0.5 : 0.1, shadowRadius: 3, elevation: 3 },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center', borderRadius: 12, zIndex: 10 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 0, borderBottomColor: themeColors.inputBorder },
    statusBadge: { paddingVertical: 1, paddingHorizontal: 1, borderRadius: 0 },
    statusBadgeText: { fontSize: 12, fontWeight: '500', color: 'white' },
    statusINS: { backgroundColor: '#6c757d' }, // Inactive
    statusANS_CLC: { backgroundColor: '#28a745' }, // Active
    statusANS_WCT: { backgroundColor: '#ffc107', color: '#000' }, // WCT
    statusFNS: { backgroundColor: '#dc3545' }, // Frozen
    fmStatusdraft: { backgroundColor: '#6c757d'},
    fmStatuspending: { backgroundColor: '#0d6efd'},
    fmStatuscompleted: { backgroundColor: '#198754'},
    fmStatuscanceled: { backgroundColor: '#dc3545'},
    fmStatusfailed: { backgroundColor: '#dc3545'},
    cardBody: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 10 },
    titleText: { fontSize: 18, fontWeight: 'bold', color: themeColors.text, marginBottom: 4 },
    recipientText: { fontSize: 14, color: themeColors.icon },
    scheduleContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 15, 
        paddingBottom: 5 
    },
    scheduleRow: { // <-- THÊM STYLE NÀY
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    scheduleText: { 
        marginLeft: 6, 
        fontSize: 13, 
        color: themeColors.icon, 
        flex: 1, // Để chiếm hết không gian còn lại
        flexShrink: 1 
    },
    countdownContainer: { paddingHorizontal: 15, paddingBottom: 10, color: themeColors.tint },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderTopWidth: 0, borderTopColor: themeColors.inputBorder },
    updatedAtText: {
      fontSize: 12,
      color: themeColors.icon,
      fontStyle: 'italic',
      flexShrink: 1, // Đảm bảo không bị tràn nếu không đủ không gian
      paddingRight: 10, // Thêm khoảng cách với các nút
    },
    cardTitle: { 
      fontSize: 18, 
      fontWeight: 'bold', 
      color: themeColors.text, 
      flex: 1, // Quan trọng: để tiêu đề chiếm hết không gian
      marginRight: 10, // Tạo khoảng cách với nhóm badge
    },
    badgeGroupContainer: {
        alignItems: 'flex-end', // Căn các badge về phía phải
    },
    methodBadge: {
        paddingHorizontal: 1,
        paddingVertical: 1,
        borderRadius: 0,
        alignItems: 'center',
    },
    methodBadgeTextLight: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
    methodBadgeTextDark: { color: '#000000', fontWeight: 'bold', fontSize: 12 },
    methodBadgePrimary: { backgroundColor: '#0d6efd' },
    methodBadgeInfo: { backgroundColor: '#0dcaf0' },
    methodBadgeWarning: { backgroundColor: '#ffc107' },    
    actionsContainer: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    actionButton: { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
    actionButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
    actionButtonPrimary: { backgroundColor: '#0d6efd' },
    actionButtonSuccess: { backgroundColor: '#198754' },
    actionButtonWarning: { backgroundColor: '#ffc107' },
    actionButtonDanger: { backgroundColor: '#dc3545' },
    disabledButton: { backgroundColor: '#6c757d' },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: themeColors.text, marginHorizontal: 15, marginBottom: 10, marginTop: 10 },
    filterContainer: { paddingHorizontal: 15, paddingBottom: 10 },
    filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: themeColors.inputBackground, marginRight: 10, },
    activeFilterButton: { backgroundColor: themeColors.tint },
    filterButtonText: { color: themeColors.text, fontWeight: '500' },
    activeFilterButtonText: { color: '#FFFFFF' },
    fab: { position: 'absolute', bottom: 25, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: themeColors.tint, justifyContent: 'center', alignItems: 'center', elevation: 8, },
});