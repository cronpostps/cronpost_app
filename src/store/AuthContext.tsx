// src/store/AuthContext.tsx
// Version: 2.0.2

import * as Google from 'expo-auth-session/providers/google';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../api/api';
import PinModal, { PinModalRef } from '../components/PinModal';
import { GoogleAuthConfig } from '../config/googleAuthConfig';
import { Colors } from '../constants/Colors';
import i18n from '../locales/i18n';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { translateApiError } from '../utils/errorTranslator';
import { useTheme } from './ThemeContext';

interface User {
  id: string;
  email: string;
  user_name: string | null;
  notifications_enabled: boolean;
  timezone: string | null;
  date_format: string;
  has_pin: boolean;
  membership_type: 'free' | 'premium';
  is_smtp_configured: boolean;
  smtp_sender_email: string | null;
  max_subject_length: number;
  max_message_chars_free: number;
  max_message_chars_premium: number;

  account_status: string; 
  checkin_on_signin: boolean;
  use_pin_for_all_actions: boolean;
  pin_code_question: string | null;
  trust_verifier_email: string | null;
  
  limit_recipients_cronpost_email_free: number;
  limit_recipients_in_app_messaging_free: number;
  limit_recipients_user_email_free: number;
  limit_recipients_cronpost_email_premium: number;
  limit_recipients_in_app_messaging_premium: number;
  limit_recipients_user_email_premium: number;
}

interface TimezoneInfo {
  name: string;
  offset: string | null;
  error?: string | null;
}

interface TimezoneApiResponse {
  results: TimezoneInfo[];
}

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const AuthContext = createContext<any>(null);

export const useAuth = () => {
  return useContext(AuthContext);
};

const checkAndUpdateTimezone = async (
  user: User | null, 
  setUser: React.Dispatch<React.SetStateAction<User | null>>, 
  hasShown: boolean, 
  setHasShown: React.Dispatch<React.SetStateAction<boolean>>
) => {
  if (!user || !user.timezone || hasShown) return;

  try {
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (deviceTimezone === user.timezone) {
      return;
    }
    const response = await api.post<TimezoneApiResponse>('/api/users/timezones/get-offsets', {
      timezones: [deviceTimezone, user.timezone]
    });
    const results = response.data.results;
    const deviceTzInfo = results.find((r: TimezoneInfo) => r.name === deviceTimezone);
    const dbTzInfo = results.find((r: TimezoneInfo) => r.name === user.timezone);
    if (!deviceTzInfo?.offset || !dbTzInfo?.offset || deviceTzInfo.offset !== dbTzInfo.offset) {
      setHasShown(true);
      Alert.alert(
        i18n.t('timezone_modal.title'),
        i18n.t('timezone_modal.body', { newTimezone: deviceTimezone }),
        [
          { text: i18n.t('timezone_modal.btn_cancel'), style: 'cancel' },
          {
            text: i18n.t('timezone_modal.btn_confirm'),
            onPress: async () => {
              try {
                await api.put('/api/users/profile', {
                  user_name: user.user_name,
                  timezone: deviceTimezone, 
                  date_format: user.date_format,
                });
                const updatedUserResponse = await api.get('/api/users/me');
                setUser(updatedUserResponse.data);
                Alert.alert(i18n.t('timezone_modal.title'), i18n.t('timezone_modal.success_message'));
              } catch (error: any) {
                console.error("Failed to update timezone:", error);
                Alert.alert(i18n.t('timezone_modal.title'), translateApiError(error));
              }
            },
          },
        ]
      );
    }
  } catch (e: any) {
    console.error("Could not perform timezone check:", e);
  }
};

export const AuthProvider = ({ children }: React.PropsWithChildren) => {
    const [authState, setAuthState] = useState<{
      accessToken: string | null;
      refreshToken: string | null;
      isAuthenticated: boolean | null;
    }>({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: null,
    });
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // const [isGoogleAuthLoading, setIsGoogleAuthLoading] = useState(false);
    const [isAuthProcessing, setIsAuthProcessing] = useState(false);

    const [isAppLocked, setIsAppLocked] = useState(true);
    const [pinModalVisible, setPinModalVisible] = useState(false);
    const [isVerifyingPin, setIsVerifyingPin] = useState(false);
    const [hasShownTimezoneAlert, setHasShownTimezoneAlert] = useState(false);
    const pinModalRef = useRef<PinModalRef>(null);
    // const router = useRouter();
    // const segments = useSegments();
    const { theme } = useTheme();
    const themeColors = Colors[theme];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: GoogleAuthConfig.androidClientId,
        iosClientId: GoogleAuthConfig.iosClientId,
        clientId: GoogleAuthConfig.expoClientId, 
    });

    const signOut = async () => {
      try { await api.post('/api/auth/signout'); } 
      catch (e: any) { console.error('Sign out API call failed, proceeding with client-side logout.', e); } 
      finally {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        setUser(null);
        setAuthState({ accessToken: null, refreshToken: null, isAuthenticated: false });
        setIsAppLocked(true);
      }
    };

    const performAutoCheckinIfNeeded = useCallback(async (userToCheck: User) => {
        if (userToCheck.checkin_on_signin && 
            !userToCheck.use_pin_for_all_actions &&
            userToCheck.account_status === 'ANS_WCT') {
            
            try {
                console.log('Performing automatic check-in (Status: WCT)...');
                await api.post('/api/ucm/check-in', { pin_code: null });
                Toast.show({
                    type: 'success',
                    text1: i18n.t('dashboard_page.alert_checkin_success'),
                    visibilityTime: 2000,
                });
            } catch (error) {
                console.error("Auto check-in failed unexpectedly:", error);
            }
        }
    }, []);
        
  const handleSuccessfulLogin = useCallback(async (accessToken: string, refreshToken: string) => {
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

      const userResponse = await api.get('/api/users/me');
      const currentUser: User = userResponse.data;
      setUser(currentUser);
      setAuthState({ accessToken: accessToken, refreshToken: refreshToken, isAuthenticated: true });

      await performAutoCheckinIfNeeded(currentUser);

      // --- BẮT ĐẦU ĐOẠN MÃ CẦN THÊM ---
      const biometricsKey = `biometrics_enabled_for_${currentUser.id}`;
      const isBiometricsEnabled = await SecureStore.getItemAsync(biometricsKey);

      if (currentUser.has_pin) {
          setIsAppLocked(true); // Đảm bảo app ở trạng thái khóa
          if (isBiometricsEnabled === 'true') {
              const result = await LocalAuthentication.authenticateAsync({
                  promptMessage: i18n.t('biometrics.prompt_message'),
              });
              if (result.success) {
                  setIsAppLocked(false);
              } else {
                  setPinModalVisible(true);
              }
          } else {
              setPinModalVisible(true);
          }
      } else {
          setIsAppLocked(false);
      }
      // --- KẾT THÚC ĐOẠN MÃ CẦN THÊM ---

  }, [performAutoCheckinIfNeeded]);
    
    useEffect(() => {
      const handleGoogleResponse = async () => {
        try {
          if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.accessToken) {
              const backendResponse = await api.post('/api/auth/google/mobile', {
                access_token: authentication.accessToken,
              });
              const { access_token, refresh_token } = backendResponse.data;
              await handleSuccessfulLogin(access_token, refresh_token);
            }
          } else if (response?.type === 'error') {
            console.error("Google Auth Error:", response.error);
            Alert.alert("Google Sign-In Error", "An error occurred during Google authentication.");
          }
        } catch (error: any) {
          console.error("Google Sign-In failed on backend:", error);
          Alert.alert("Google Sign-In Failed", "Could not sign in with Google. Please try again.");
        } finally {
          setIsAuthProcessing(false);
        }
      };
      if (response) { handleGoogleResponse(); }
    }, [response, handleSuccessfulLogin]);
  
    useEffect(() => {
      const loadTokens = async () => {
        try {
          const accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
          
          if (accessToken) {
            setAuthState(prev => ({ ...prev, accessToken, isAuthenticated: true }));
            const userResponse = await api.get('/api/users/me');
            const currentUser: User = userResponse.data;
            setUser(currentUser);
            
            await performAutoCheckinIfNeeded(currentUser);

            const biometricsKey = `biometrics_enabled_for_${currentUser.id}`;
            const isBiometricsEnabled = await SecureStore.getItemAsync(biometricsKey);

            if (currentUser.has_pin) {
                setIsAppLocked(true);
                if (isBiometricsEnabled === 'true') {
                    const result = await LocalAuthentication.authenticateAsync({
                        promptMessage: i18n.t('biometrics.prompt_message'),
                    });
                    if (result.success) {
                        setIsAppLocked(false);
                    } else {
                        setPinModalVisible(true);
                    }
                } else {
                    setPinModalVisible(true);
                }
            } else {
                setIsAppLocked(false);
            }
          } else {
            setAuthState({ accessToken: null, refreshToken: null, isAuthenticated: false });
            setIsAppLocked(false);
          }

        } catch {
          signOut();
        } finally {
          setIsLoading(false);
        }
      };
      loadTokens();
    }, [performAutoCheckinIfNeeded]);
    
    useEffect(() => {
      if (user && !isLoading) { 
        checkAndUpdateTimezone(user, setUser, hasShownTimezoneAlert, setHasShownTimezoneAlert);
        if (user.notifications_enabled) {
          console.log('User has notifications enabled. Registering for push notifications...');
          registerForPushNotificationsAsync();        
        }
      }
    }, [user, isLoading, hasShownTimezoneAlert]);
  
    // useEffect(() => {
    //   if (isLoading) return;
    //   const inAuthGroup = segments[0] === '(main)';
    //   if (authState.isAuthenticated && !inAuthGroup) { router.replace('/(main)/dashboard'); } 
    //   else if (!authState.isAuthenticated && inAuthGroup) { router.replace('/'); }
    // }, [authState.isAuthenticated, isLoading, segments, router]);
  
    const signIn = async (email: string, password: string) => {
      try {
        const response = await api.post('/api/auth/signin', { email, password });
        const { access_token, refresh_token } = response.data;
        await handleSuccessfulLogin(access_token, refresh_token);
      } catch (e: any) { console.error('Sign in failed', e); throw e; }
    };
  
    // const signInWithGoogle = async () => {
    //   setIsGoogleAuthLoading(true);
    //   await promptAsync();
    // };
    const signInWithGoogle = async () => {
      setIsAuthProcessing(true); // <-- THÊM DÒNG NÀY
      await promptAsync();
    };
  
    const refreshUser = async () => {
      try {
          const userResponse = await api.get('/api/users/me');
          setUser(userResponse.data);
          return userResponse.data;
      } catch (error: any) {
          console.error("Failed to refresh user data", error);
          if (error.response?.status === 401) { signOut(); }
          return null;
      }
    };

    const handlePinClose = () => {
        setPinModalVisible(true);
    };

    const handlePinSubmit = async (pin: string) => {
        if (isVerifyingPin) return;
        setIsVerifyingPin(true);
        try {
            await api.post('/api/users/verify-pin-session', { pin_code: pin });
            setPinModalVisible(false);
            setIsAppLocked(false);
        } catch (error: any) {
            Alert.alert(
                i18n.t('pin_modal.header'),
                translateApiError(error),
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            pinModalRef.current?.resetPin();
                        },
                    },
                ]
            );
        } finally {
            setIsVerifyingPin(false);
        }
    };
  
    const value = { signIn, signInWithGoogle, signOut, user, isLoading, isAuthenticated: authState.isAuthenticated, isAuthProcessing, refreshUser };
    
    const styles = StyleSheet.create({
        lockScreenContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: themeColors.background,
        }
    });

    if (isLoading) {
      return <View style={styles.lockScreenContainer}><ActivityIndicator size="large" /></View>;
    }
    
    if (authState.isAuthenticated && isAppLocked) {
        return (
            <View style={styles.lockScreenContainer}>
                <PinModal
                    ref={pinModalRef} 
                    isVisible={pinModalVisible}
                    onClose={handlePinClose}
                    onSubmit={handlePinSubmit}
                    promptText={i18n.t('pin_modal.prompt_security_verification')}
                />
                {!pinModalVisible && <ActivityIndicator size="large" />}
            </View>
        );
    }

  // if (isGoogleAuthLoading) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
  //       <ActivityIndicator size="large" />
  //     </View>
  //   );
  // }
  
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};