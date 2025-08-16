// app/(main)/settings/security.tsx
// Version 1.3.0 (Improved UX for Security Options)

import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../../src/api/api';
import PinModal from '../../../src/components/PinModal';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

export default function SecuritySettingsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const themeColors = Colors[theme];

  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [usePinForAllActions, setUsePinForAllActions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinModalVisible, setPinModalVisible] = useState(false);
  const [pinModalAction, setPinModalAction] = useState<'enable_bio' | 'remove_pin' | 'save_options' | null>(null);
  const [pendingOptionsValue, setPendingOptionsValue] = useState<boolean | null>(null);

  const BIOMETRICS_KEY = `biometrics_enabled_for_${user?.id}`;

  useEffect(() => {
    const loadSettings = async () => {
      if (user?.id) {
        const storedBioValue = await SecureStore.getItemAsync(BIOMETRICS_KEY);
        setIsBiometricsEnabled(storedBioValue === 'true');
        setUsePinForAllActions(user.use_pin_for_all_actions || false);
      }
      setIsLoading(false);
    };
    loadSettings();
  }, [user, BIOMETRICS_KEY]);

const handleBiometricsToggle = async (value: boolean) => {
    if (!user?.has_pin) {
        Toast.show({ type: 'error', text1: t('errors.title_error'), text2: t('security_page.pin_required_for_bio')});
        return;
    }
    if (value) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) { 
            Toast.show({ type: 'error', text1: t('security_page.biometrics_error_title'), text2: t('security_page.error_no_hardware') }); 
            return; 
        }
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!isEnrolled) { 
            Toast.show({ type: 'error', text1: t('security_page.biometrics_error_title'), text2: t('security_page.error_not_enrolled') }); 
            return; 
        }
        setPinModalAction('enable_bio');
        setPinModalVisible(true);
    } else {
        await SecureStore.deleteItemAsync(BIOMETRICS_KEY);
        setIsBiometricsEnabled(false);
    }
};

  const handleRemovePin = () => {
    Alert.alert(
      t('security_page.remove_pin_confirm_title'),
      t('security_page.remove_pin_confirm_body'),
      [
        { text: t('settings_page.btn_cancel'), style: 'cancel' },
        { text: t('settings_page.btn_confirm'), style: 'destructive', onPress: () => {
            setPinModalAction('remove_pin');
            setPinModalVisible(true);
        }},
      ]
    );
  };

  const handleSecurityOptionsToggle = (newValue: boolean) => {
    setPendingOptionsValue(newValue);
    setPinModalAction('save_options');
    setPinModalVisible(true);
  };

  const handlePinSubmit = async (pin: string) => {
      setPinModalVisible(false);
      const currentAction = pinModalAction;
      setPinModalAction(null);

      try {
          if (currentAction === 'enable_bio') {
              await api.post('/api/users/verify-pin-session', { pin_code: pin });
              await SecureStore.setItemAsync(BIOMETRICS_KEY, 'true');
              setIsBiometricsEnabled(true);
              Toast.show({ type: 'success', text1: t('security_page.success_biometrics_enabled') });
          } else if (currentAction === 'remove_pin') {
              await api.delete('/api/users/pin', { data: { pin_code: pin } });
              await SecureStore.deleteItemAsync(BIOMETRICS_KEY);
              setIsBiometricsEnabled(false);
              await refreshUser();
              Toast.show({ type: 'success', text1: t('security_page.success_pin_removed') });
          } else if (currentAction === 'save_options') {
              await api.put('/api/users/security-options', { 
                  use_pin_for_all_actions: pendingOptionsValue,
                  pin_code: pin 
              });
              await refreshUser();
              Toast.show({ type: 'success', text1: t('security_page.success_options_saved') });
          }
      } catch (error) {
          Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
      } finally {
          setPendingOptionsValue(null);
      }
  };
  
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    sectionHeader: { fontSize: 14, fontWeight: 'bold', color: themeColors.icon, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, textTransform: 'uppercase' },
    itemContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 20, backgroundColor: themeColors.inputBackground },
    itemTextContainer: { flex: 1, marginRight: 10 },
    itemLabel: { fontSize: 16, color: themeColors.text },
    itemDescription: { fontSize: 12, color: themeColors.icon, marginTop: 2 },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: themeColors.inputBorder, marginLeft: 20 },
  });

  const SectionSeparator = () => <View style={{height: 30}} />;

  const renderPinOptions = () => {
    if (!user) return <ActivityIndicator />;

    if (user.has_pin) {
      return (
        <View style={{borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: themeColors.inputBorder, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder}}>
            <TouchableOpacity style={styles.itemContainer} onPress={() => router.push('/settings/changePin')}>
                <Text style={styles.itemLabel}>{t('security_page.item_change_pin')}</Text>
                <Ionicons name="chevron-forward" size={20} color={themeColors.icon} />
            </TouchableOpacity>
            <View style={styles.separator} />
            <TouchableOpacity style={styles.itemContainer} onPress={handleRemovePin}>
                <Text style={styles.itemLabel}>{t('security_page.item_remove_pin')}</Text>
                <Ionicons name="chevron-forward" size={20} color={themeColors.icon} />
            </TouchableOpacity>
             <View style={styles.separator} />
            <TouchableOpacity style={styles.itemContainer} onPress={() => router.push('/settings/recoverPin')}>
                <Text style={[styles.itemLabel, {color: themeColors.tint}]}>{t('security_page.item_forgot_pin')}</Text>
                <Ionicons name="chevron-forward" size={20} color={themeColors.icon} />
            </TouchableOpacity>
        </View>
      );
    } else {
      return (
         <View style={{borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: themeColors.inputBorder, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder}}>
            <TouchableOpacity style={styles.itemContainer} onPress={() => router.push('/settings/createPin')}>
                <Text style={styles.itemLabel}>{t('security_page.item_create_pin')}</Text>
                <Ionicons name="chevron-forward" size={20} color={themeColors.icon} />
            </TouchableOpacity>
        </View>
      );
    }
  };

  const renderSecurityOptions = () => {
    if (!user || !user.has_pin) return null;

    return (
        <>
            <SectionSeparator />
            <Text style={styles.sectionHeader}>{t('security_page.group_options')}</Text>
            <View style={{borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: themeColors.inputBorder, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder}}>
                <View style={styles.itemContainer}>
                    <View style={styles.itemTextContainer}>
                        <Text style={styles.itemLabel}>{t('security_page.require_pin_label')}</Text>
                        <Text style={styles.itemDescription}>{t('security_page.require_pin_desc')}</Text>
                    </View>
                    <Switch value={usePinForAllActions} onValueChange={handleSecurityOptionsToggle} trackColor={{ false: themeColors.inputBorder, true: themeColors.tint }} thumbColor={'#ffffff'}/>
                </View>
            </View>
        </>
    );
  };
  
  const getPinModalPrompt = () => {
    switch(pinModalAction) {
        case 'enable_bio': return t('security_page.pin_prompt_enable_bio');
        case 'remove_pin': return t('security_page.pin_prompt_remove_pin');
        case 'save_options': return t('security_page.pin_prompt_save_options');
        default: return t('pin_modal.default_prompt');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.sectionHeader}>{t('security_page.group_biometrics')}</Text>
        <View style={{borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: themeColors.inputBorder, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder}}>
            <View style={styles.itemContainer}>
                <View style={styles.itemTextContainer}>
                    <Text style={styles.itemLabel}>{t('security_page.biometrics_label')}</Text>
                    <Text style={styles.itemDescription}>{t('security_page.biometrics_desc')}</Text>
                </View>
                {isLoading ? <ActivityIndicator/> : <Switch value={isBiometricsEnabled} onValueChange={handleBiometricsToggle} trackColor={{ false: themeColors.inputBorder, true: themeColors.tint }} thumbColor={'#ffffff'} />}
            </View>
        </View>

        <SectionSeparator />

        <Text style={styles.sectionHeader}>{t('security_page.group_pin')}</Text>
        {renderPinOptions()}

        {renderSecurityOptions()}
      </ScrollView>
      
      <PinModal
        isVisible={isPinModalVisible}
        onClose={() => setPinModalVisible(false)}
        onSubmit={handlePinSubmit}
        promptText={getPinModalPrompt()}
      />
    </SafeAreaView>
  );
}