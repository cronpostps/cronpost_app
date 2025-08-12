// app/fns.tsx
// Version: 1.0.2

import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../src/api/api';
import PinModal, { PinModalRef } from '../src/components/PinModal';
import { Colors } from '../src/constants/Colors';
import { useAuth } from '../src/store/AuthContext';
import { useTheme } from '../src/store/ThemeContext';
import { translateApiError } from '../src/utils/errorTranslator';

export default function FnsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const styles = createStyles(themeColors);
  const { user } = useAuth();
  const [isTerminating, setIsTerminating] = React.useState(false);
  const [isPinModalVisible, setIsPinModalVisible] = useState(false);
  const pinModalRef = useRef<PinModalRef>(null);
  const handleTerminate = async () => {
    if (!user) return;

    const BIOMETRICS_KEY = `biometrics_enabled_for_${user.id}`;
    const isBiometricsEnabled = await SecureStore.getItemAsync(BIOMETRICS_KEY);

    // Trường hợp 1: Sinh trắc học được bật và người dùng có mã PIN
    if (isBiometricsEnabled === 'true' && user.has_pin) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('biometrics.prompt_message'),
      });

      if (result.success) {
        // Nếu thành công, thực hiện dừng FNS ngay
        await performTerminate(null);
      } else {
        // Nếu thất bại, quay về phương án dự phòng là mã PIN
        setIsPinModalVisible(true);
      }
    // Trường hợp 2: Sinh trắc học không bật, nhưng người dùng có mã PIN
    } else if (user.has_pin) {
      setIsPinModalVisible(true);
    // Trường hợp 3: Không có PIN, chỉ cần xác nhận qua Alert
    } else {
      Alert.alert(
        t('fns_page.confirm_terminate_title'),
        t('fns_page.confirm_terminate_body'),
        [
          { text: t('confirm_modal.btn_cancel'), style: 'cancel' },
          {
            text: t('confirm_modal.btn_confirm'),
            style: 'destructive',
            onPress: () => performTerminate(null),
          },
        ]
      );
    }
  };

  const performTerminate = async (pinCode: string | null) => {
    setIsTerminating(true);
    setIsPinModalVisible(false);
    try {
      const payload = { pin_code: pinCode };
      await api.post('/api/ucm/terminate', payload);
      Toast.show({ type: 'success', text2: t('fns_page.success_terminated') });
      router.replace('/(main)/dashboard');
    } catch (error) {
      Alert.alert(t('errors.title_error'), translateApiError(error));
      pinModalRef.current?.resetPin();
    } finally {
      setIsTerminating(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="warning" size={64} color={themeColors.tint} />
        <Text style={styles.header}>{t('fns_page.card_title')}</Text>
        <Text style={styles.description}>{t('fns_page.p1')}</Text>
        <Text style={styles.description}>
          {t('fns_page.p2_part1')}{' '}
          <Text style={{ fontWeight: 'bold' }}>{t('fns_page.p2_strong')}</Text>.
          {t('fns_page.p2_part2')}
        </Text>

        <TouchableOpacity style={styles.terminateButton} onPress={handleTerminate} disabled={isTerminating}>
          {isTerminating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('fns_page.btn_terminate')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(main)/dashboard')} disabled={isTerminating}>
          <Text style={styles.backLink}>{t('fns_page.btn_back')}</Text>
        </TouchableOpacity>
      </View>
      <PinModal
          ref={pinModalRef}
          isVisible={isPinModalVisible}
          onClose={() => setIsPinModalVisible(false)}
          onSubmit={(pin) => performTerminate(pin)}
          promptText={t('fns_page.pin_prompt')}
      />      
    </SafeAreaView>
  );
}

const createStyles = (themeColors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      width: '90%',
      maxWidth: 400,
      padding: 20,
      borderRadius: 12,
      backgroundColor: themeColors.card,
      alignItems: 'center',
    },
    header: {
      fontSize: 22,
      fontWeight: 'bold',
      color: themeColors.text,
      marginTop: 15,
      marginBottom: 10,
      textAlign: 'center',
    },
    description: {
      fontSize: 16,
      color: themeColors.icon,
      textAlign: 'center',
      marginBottom: 15,
      lineHeight: 22,
    },
    terminateButton: {
      backgroundColor: '#dc3545',
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
      marginTop: 20,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    backLink: {
      color: themeColors.tint,
      marginTop: 20,
      fontSize: 16,
    },
  });