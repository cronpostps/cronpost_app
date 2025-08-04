// app/(main)/dashboard.tsx
// Version: 1.2.0

import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import api from '../../src/api/api';
import { DashboardHeader } from '../../src/components/DashboardHeader';
import { Colors } from '../../src/constants/Colors';
import { useAuth } from '../../src/store/AuthContext';
import { useTheme } from '../../src/store/ThemeContext';
import { translateApiError } from '../../src/utils/errorTranslator';

const DashboardScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const themeColors = Colors[theme];

  const [dashboardState, setDashboardState] = useState({
    isLoading: true,
    status: 'INS',
    countdownTarget: null,
    userName: user?.email || '',
    timezone: 'UTC',
    dateFormat: 'dd/mm/yyyy',
  });
  const [countdown, setCountdown] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // Ensure we start with loading state on refetch
      setDashboardState(prev => ({ ...prev, isLoading: true }));
      const response = await api.get('/api/users/me');
      const userData = response.data;
      setDashboardState({
        isLoading: false,
        status: userData.account_status,
        countdownTarget: userData.wct_active_ends_at || userData.next_clc_prompt_at,
        userName: userData.user_name || userData.email,
        timezone: userData.timezone || 'UTC',
        dateFormat: userData.date_format || 'dd/mm/yyyy',
      });
    } catch (error) {
      setDashboardState(prev => ({ ...prev, isLoading: false }));
      Alert.alert(t('errors.page_load_failed'), translateApiError(error));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!dashboardState.countdownTarget) {
      setCountdown('');
      return;
    }

    const interval = setInterval(() => {
      const targetTime = new Date(dashboardState.countdownTarget).getTime();
      const now = new Date().getTime();
      const distance = targetTime - now;

      if (distance < 0) {
        clearInterval(interval);
        setCountdown(t('dashboard_page.status_processing'));
        setTimeout(fetchDashboardData, 5000); // Add a longer delay before refetching
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      let countdownText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      if (days > 0) {
        countdownText = `${days}d ${countdownText}`;
      }
      setCountdown(countdownText);
    }, 1000);

    return () => clearInterval(interval);
  }, [dashboardState.countdownTarget]);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await api.post('/api/ucm/check-in');
      Alert.alert(t('dashboard_page.alert_checkin_success'));
      fetchDashboardData();
    } catch (error) {
      Alert.alert(t('errors.checkin_failed', { message: translateApiError(error) }));
    } finally {
      setIsCheckingIn(false);
    }
  };

  const renderContent = () => {
    if (dashboardState.isLoading) {
      return <ActivityIndicator size="large" color={themeColors.tint} />;
    }

    let mainButton;
    let countdownLabel = '';

    switch (dashboardState.status) {
      case 'ANS_WCT':
        mainButton = (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: themeColors.tint }]}
            onPress={handleCheckIn}
            disabled={isCheckingIn}>
            {isCheckingIn ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.actionButtonText}>{t('dashboard_page.btn_check_in')}</Text>
            )}
          </TouchableOpacity>
        );
        countdownLabel = t('dashboard_page.countdown_label_wct');
        break;

      case 'ANS_CLC':
        mainButton = (
          <View style={[styles.actionButton, styles.disabledButton]}>
            <Text style={styles.disabledButtonText}>{t('dashboard_page.btn_check_in')}</Text>
          </View>
        );
        countdownLabel = t('dashboard_page.countdown_label_clc');
        break;

      case 'INS':
        mainButton = (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#28a745' }]}
            onPress={() => router.push('/(main)/ucm')}>
            <Text style={styles.actionButtonText}>{t('dashboard_page.btn_create_im')}</Text>
          </TouchableOpacity>
        );
        countdownLabel = t('dashboard_page.countdown_label_ins');
        break;

      case 'FNS':
        mainButton = (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#dc3545' }]}
            onPress={() => { /* Navigate to a dedicated FNS screen later */ }}>
            <Text style={styles.actionButtonText}>{t('dashboard_page.btn_stop_fns')}</Text>
          </TouchableOpacity>
        );
        countdownLabel = t('dashboard_page.countdown_label_fns');
        break;

      default:
        mainButton = null;
        countdownLabel = t('dashboard_page.countdown_label_unknown');
    }

    return (
      <>
        {mainButton}
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>{countdownLabel}</Text>
          {countdown ? <Text style={styles.countdownTimer}>{countdown}</Text> : null}
        </View>
      </>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: themeColors.background,
      padding: 20,
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
    },
    actionButtonText: {
      color: '#ffffff',
      fontSize: 24,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    disabledButton: {
      backgroundColor: themeColors.inputBorder,
    },
    disabledButtonText: {
      color: themeColors.icon,
      fontSize: 24,
      fontWeight: 'bold',
    },
    countdownContainer: {
      position: 'absolute',
      bottom: 40,
      alignItems: 'center',
    },
    countdownLabel: {
      fontSize: 16,
      color: themeColors.text,
      textAlign: 'center',
    },
    countdownTimer: {
      fontSize: 36,
      fontWeight: 'bold',
      color: themeColors.tint,
      marginTop: 10,
      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
  });

  return (
    <View style={styles.container}>
      {!dashboardState.isLoading && (
        <DashboardHeader
          userName={dashboardState.userName}
          status={dashboardState.status}
          timezone={dashboardState.timezone}
          dateFormat={dashboardState.dateFormat}
        />
      )}
      {renderContent()}
    </View>
  );
};

export default DashboardScreen;
