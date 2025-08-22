// app/(main)/dashboard.tsx
// Version: 2.0.5

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';

import api from '../../src/api/api';
import { DashboardHeader } from '../../src/components/DashboardHeader';
import PinModal, { PinModalRef } from '../../src/components/PinModal';
import { Colors } from '../../src/constants/Colors';
import { useAuth } from '../../src/store/AuthContext';
import { useTheme } from '../../src/store/ThemeContext';
import { translateApiError } from '../../src/utils/errorTranslator';

const Countdown = ({ target, label, styles }: any) => {
  const [countdown, setCountdown] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    if (!target) {
      setCountdown('');
      return;
    }
    const interval = setInterval(() => {
      const distance = new Date(target).getTime() - new Date().getTime();
      if (distance < 0) {
        clearInterval(interval);
        setCountdown(t('dashboard_page.status_processing'));
        return;
      }
      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      let text = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      if (d > 0) text = `${d}d ${text}`;
      setCountdown(text);
    }, 1000);
    return () => clearInterval(interval);
  }, [target, t]);

  return (
    <View style={styles.countdownContainer}>
      <Text style={styles.countdownLabel}>{label}</Text>
      {countdown ? <Text style={styles.countdownTimer}>{countdown}</Text> : null}
    </View>
  );
};

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const themeColors = Colors[theme];
  const styles = createStyles(themeColors);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ucmData, setUcmData] = useState<any>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [pinModalAction, setPinModalAction] = useState<'check-in' | 'terminate' | null>(null);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const pinModalRef = useRef<PinModalRef>(null);
  const refreshUserRef = useRef(refreshUser);
  useEffect(() => {
    refreshUserRef.current = refreshUser;
  }, [refreshUser]);

  const forceRefreshData = useCallback(async () => {
    setIsActionLoading(false);
    try {
      const latestUser = await refreshUserRef.current();
      if (!latestUser) throw new Error("Failed to refresh user data.");

      if (latestUser.account_status === 'FNS') {
        setUcmData(null);
      } else {
        const response = await api.get('/api/ucm/full-state');
        setUcmData(response.data);
      }
    } catch (error) {
      if ((error as any).response?.status !== 403) {
        Alert.alert(t('errors.page_load_failed'), translateApiError(error));
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      forceRefreshData();
    }, [forceRefreshData])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    forceRefreshData();
  }, [forceRefreshData]);

  const handleCheckIn = async () => {
    if (!user) return;

    if (user.use_pin_for_all_actions) {
      setPinModalAction('check-in');
      setIsPinModalVisible(true);
    } else {
      Alert.alert(
        t('confirm_modal.default_title'),
        t('ucm_page.prompts.confirm_im_checkin'),
        [
          { text: t('confirm_modal.btn_cancel'), style: 'cancel' },
          { text: t('confirm_modal.btn_confirm'), onPress: () => performCheckIn(null) }
        ]
      );
    }
  };

  const performCheckIn = async (pinCode: string | null) => {
    setIsActionLoading(true);
    setIsPinModalVisible(false);
    try {
      await api.post('/api/ucm/check-in', { pin_code: pinCode });
      Toast.show({ type: 'success', text2: t('ucm_page.prompts.checkin_success') });
      await forceRefreshData();
    } catch (error) {
      Alert.alert(t('errors.checkin_failed', { message: translateApiError(error) }));
      pinModalRef.current?.resetPin();
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStopFns = async () => {
    if (!user) return;
    if (user.use_pin_for_all_actions || user.has_pin) {
      setPinModalAction('terminate');
      setIsPinModalVisible(true);
    } else {
      Alert.alert(
        t('fns_page.card_header'),
        t('fns_page.confirm_terminate'),
        [
          { text: t('confirm_modal.btn_cancel'), style: 'cancel' },
          { text: t('confirm_modal.btn_confirm'), style: 'destructive', onPress: () => performStopFns(null) },
        ]
      );
    }
  };

  const performStopFns = async (pinCode: string | null) => {
    setIsActionLoading(true);
    setIsPinModalVisible(false);
    try {
      await api.post('/api/ucm/terminate', { pin_code: pinCode });
      Toast.show({ type: 'success', text2: t('fns_page.success_terminated') });
      await forceRefreshData();
    } catch (error) {
      Alert.alert(t('errors.title_error'), translateApiError(error));
      pinModalRef.current?.resetPin();
    } finally {
      setIsActionLoading(false);
    }
  };

  const handlePinSubmit = (pin: string) => {
    if (pinModalAction === 'check-in') {
      performCheckIn(pin);
    } else if (pinModalAction === 'terminate') {
      performStopFns(pin);
    }
  };

  const renderContent = () => {
    if (isLoading && !isRefreshing) {
      return <ActivityIndicator size="large" color={themeColors.tint} />;
    }

    let buttonText = '';
    let buttonColor = themeColors.tint;
    let countdownLabel = '';
    let countdownTarget = null;
    let buttonAction = () => {};

    const hasIM = ucmData?.initialMessage;
    const status = user?.account_status;

    if (status === 'FNS') {
      buttonText = t('dashboard_page.btn_stop_fns');
      buttonColor = '#dc3545';
      countdownLabel = t('dashboard_page.countdown_label_fns');
      buttonAction = handleStopFns;
    } else if (!hasIM) {
      buttonText = t('dashboard_page.btn_create_im');
      buttonColor = '#28a745';
      countdownLabel = t('dashboard_page.countdown_label_ins');
      buttonAction = () => router.push('/(main)/ucm');
    } else if (status === 'INS') {
      buttonText = t('dashboard_page.btn_activate_ucm');
      buttonColor = '#0dcaf0';
      countdownLabel = t('dashboard_page.countdown_label_inactive_im');
      buttonAction = () => router.push({ pathname: '/(main)/ucm', params: { autoAction: 'activate' } });
    } else if (status === 'ANS_CLC') {
      buttonText = t('dashboard_page.btn_deactivate_ucm');
      buttonColor = '#ffc107';
      countdownLabel = t('ucm_page.im_section.countdown_clc'); 
      countdownTarget = ucmData?.ucmState?.countdownUntil;
      buttonAction = () => router.push({ pathname: '/(main)/ucm', params: { autoAction: 'stop' } });
    } else if (status === 'ANS_WCT') {
      buttonText = t('dashboard_page.btn_check_in');
      buttonColor = themeColors.tint;
      countdownLabel = t('ucm_page.im_section.countdown_wct');
      countdownTarget = ucmData?.ucmState?.countdownUntil;
      buttonAction = handleCheckIn;
    } else {
      countdownLabel = t('dashboard_page.countdown_label_unknown');
    }

    return (
      <View style={styles.contentContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: buttonColor }]}
          onPress={buttonAction}
          disabled={isActionLoading}
        >
          {isActionLoading ? 
            <ActivityIndicator color="#ffffff" /> : 
            <Text style={styles.actionButtonText}>{buttonText}</Text>
          }
        </TouchableOpacity>
        <Countdown target={countdownTarget} label={countdownLabel} styles={styles} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
        <ScrollView
            contentContainerStyle={styles.scrollContentContainer}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={themeColors.tint} />}
        >
            <DashboardHeader />
            {renderContent()}
        </ScrollView>
        <PinModal
            ref={pinModalRef}
            isVisible={isPinModalVisible}
            onClose={() => setIsPinModalVisible(false)}
            onSubmit={handlePinSubmit}
            promptText={
                pinModalAction === 'terminate' 
                ? t('fns_page.pin_prompt')
                : t('dashboard_page.pin_prompt_checkin')
            }
        />
    </View>
  );
}

const createStyles = (themeColors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    padding: 10,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  countdownContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  countdownLabel: {
    fontSize: 16,
    color: themeColors.text,
    textAlign: 'center',
    minHeight: 40,
  },
  countdownTimer: {
    fontSize: 36,
    fontWeight: 'bold',
    color: themeColors.tint,
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
});