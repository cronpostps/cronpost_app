// src/store/AuthContext.tsx
// Version: 2.3.1

import * as AppleAuthentication from 'expo-apple-authentication';
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
import { useIamStore } from './iamStore';

import Purchases, { CustomerInfo } from 'react-native-purchases';
import { revenueCatConfig } from '../config/revenueCatConfig';

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
    console.log("--- AuthProvider ĐANG RENDER ---");
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
    const [isPremium, setIsPremium] = useState<boolean>(false);
    const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthProcessing, setIsAuthProcessing] = useState(false);
    const [isAppLocked, setIsAppLocked] = useState(true);
    const [pinModalVisible, setPinModalVisible] = useState(false);
    const [isVerifyingPin, setIsVerifyingPin] = useState(false);
    const [hasShownTimezoneAlert, setHasShownTimezoneAlert] = useState(false);
    const pinModalRef = useRef<PinModalRef>(null);
    const hasRegisteredForPush = useRef(false);
    const { theme } = useTheme();
    const themeColors = Colors[theme];

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: GoogleAuthConfig.androidClientId,
        iosClientId: GoogleAuthConfig.iosClientId,
        clientId: GoogleAuthConfig.expoClientId, 
    });

    const signOut = useCallback(async () => {
      try { 
        await Purchases.logOut();
        await api.post('/api/auth/signout');
      } 
      catch (e: any) { console.error('Sign out failed, proceeding with client-side logout.', e); } 
      finally {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        setUser(null);
        setAuthState({ accessToken: null, refreshToken: null, isAuthenticated: false });
        setIsAppLocked(true);
      }
    }, []);

    const performAutoCheckinIfNeeded = useCallback(async (userToCheck: User) => {
        if (userToCheck.checkin_on_signin && 
            !userToCheck.use_pin_for_all_actions &&
            userToCheck.account_status === 'ANS_WCT') {
            try {
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

        try {
            console.log(`[RevenueCat Debug] Attempting to log in user with ID: ${currentUser.id}`);
            await Purchases.logIn(currentUser.id);
            console.log(`[RevenueCat Debug] Successfully logged in user: ${currentUser.id}`);
        } catch (e: any) {
            console.error(`[RevenueCat Debug] ERROR logging in user: ${currentUser.id}`, e);
        }

        const customerInfo = await Purchases.getCustomerInfo();
        const premiumEntitlement = customerInfo.entitlements.active[revenueCatConfig.entitlementId];
        setIsPremium(typeof premiumEntitlement !== 'undefined');
        setUser(currentUser);
        setAuthState({ accessToken: accessToken, refreshToken: refreshToken, isAuthenticated: true });
        useIamStore.getState().fetchUnreadCount();
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
    }, [performAutoCheckinIfNeeded]);

    useEffect(() => {
      const initializeRevenueCat = async () => {
        if (__DEV__) {
          await Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        }
        try {
          await Purchases.configure({ apiKey: revenueCatConfig.apiKey });
          setIsRevenueCatReady(true);
          console.log('RevenueCat SDK configured successfully.');
        } catch (e) {
          console.error("Failed to configure RevenueCat:", e);
          setIsRevenueCatReady(false);
        }
      };

      initializeRevenueCat();
    }, []);

    useEffect(() => {
      const customerInfoUpdateListener = (customerInfo: CustomerInfo) => { 
        const premiumEntitlement = customerInfo.entitlements.active[revenueCatConfig.entitlementId];
        
        if (typeof premiumEntitlement !== 'undefined') {
          setIsPremium(true);
        } else {
          setIsPremium(false);
        }
      };

      Purchases.addCustomerInfoUpdateListener(customerInfoUpdateListener);

      return () => {
        Purchases.removeCustomerInfoUpdateListener(customerInfoUpdateListener);
      };
    }, []);
    
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
            Alert.alert("Google Sign-In Error", "An error occurred during Google authentication.");
          }
        } catch (error: any) {
          const friendlyError = translateApiError(error);
          Alert.alert(
            i18n.t('signin_page.title'), 
            i18n.t('signin_page.status.google_oauth_error', { detail: friendlyError })
          );
        } finally {
          setIsAuthProcessing(false);
        }
      };
      if (response) { handleGoogleResponse(); }
    }, [response, handleSuccessfulLogin]);
  
  useEffect(() => {
    const loadTokens = async () => {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          console.warn('[Auth Timeout] Quá trình xác thực mất quá 30 giây. Đang tiến hành đăng xuất.');
          reject(new Error('Auth process timed out'));
        }, 30000)
      );

      console.log("--- Auth: 1. Bắt đầu quá trình tải token ---");
      try {
        await Promise.race([
          (async () => {
            const accessToken = await SecureStore.getItemAsync(TOKEN_KEY);

            if (accessToken) {
              console.log("--- Auth: 2. Đã tìm thấy access token ---");
              setAuthState(prev => ({ ...prev, accessToken, isAuthenticated: true }));
              console.log("--- Auth: 3. Đang lấy thông tin người dùng ---");
              // const customerInfo = await Purchases.getCustomerInfo();
              // const premiumEntitlement = customerInfo.entitlements.active[revenueCatConfig.entitlementId];
              // setIsPremium(typeof premiumEntitlement !== 'undefined');

              try {
                const userResponse = await api.get('/api/users/me');
                const currentUser: User = userResponse.data;
                setUser(currentUser);

                try {
                    console.log(`[RevenueCat Debug] (onAppLoad) Attempting to log in user with ID: ${currentUser.id}`);
                    await Purchases.logIn(currentUser.id);
                    console.log(`[RevenueCat Debug] (onAppLoad) Successfully logged in user: ${currentUser.id}`);
                } catch (e: any) {
                    console.error(`[RevenueCat Debug] (onAppLoad) ERROR logging in user: ${currentUser.id}`, e);
                }

                console.log("--- Auth: 4. Lấy thông tin người dùng thành công. Trạng thái tài khoản:", currentUser.account_status);

                const customerInfo = await Purchases.getCustomerInfo();
                const premiumEntitlement = customerInfo.entitlements.active[revenueCatConfig.entitlementId];
                setIsPremium(typeof premiumEntitlement !== 'undefined');

                useIamStore.getState().fetchUnreadCount();
                await performAutoCheckinIfNeeded(currentUser);
                const biometricsKey = `biometrics_enabled_for_${currentUser.id}`;
                const isBiometricsEnabled = await SecureStore.getItemAsync(biometricsKey);

                if (currentUser.has_pin) {
                  console.log("--- Auth: 5. Người dùng có mã PIN. Chuẩn bị khóa ứng dụng ---");
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
                  console.log("--- Auth: 7. Người dùng không có PIN. Mở khóa ứng dụng ---");
                  setIsAppLocked(false);
                }
              } catch (apiError: any) {
                console.error("--- Auth: 3b. LỖI KHI GỌI API, TIẾN HÀNH ĐĂNG XUẤT ---:", apiError.message);
                throw apiError;
              }
            } else {
              console.log("--- Auth: 2. Không tìm thấy access token ---");
              setAuthState({ accessToken: null, refreshToken: null, isAuthenticated: false });
              setIsAppLocked(false);
            }
          })(),
          timeoutPromise
        ]);
      } catch (error) {
        console.error("--- Auth: LỖI trong quá trình loadTokens, thực hiện signOut ---", error);
        await signOut();
      } finally {
        console.log("--- Auth: 8. Kết thúc quá trình tải token ---");
        setIsLoading(false);
      }
    };
    loadTokens();
  }, [performAutoCheckinIfNeeded, signOut]);
    
    useEffect(() => {
       if (user && !isLoading && !hasRegisteredForPush.current) { 
        checkAndUpdateTimezone(user, setUser, hasShownTimezoneAlert, setHasShownTimezoneAlert);
        if (user.notifications_enabled) {
          console.log('User has notifications enabled. Registering for push notifications...');
          registerForPushNotificationsAsync();     
          hasRegisteredForPush.current = true;   
        }
      }
    }, [user, isLoading, hasShownTimezoneAlert]);
  
    const signIn = async (email: string, password: string) => {
      try {
        const response = await api.post('/api/auth/signin', { email, password });
        const { access_token, refresh_token } = response.data;
        await handleSuccessfulLogin(access_token, refresh_token);
      } catch (e: any) { throw e; }
    };
  
    const signInWithGoogle = async () => {
      setIsAuthProcessing(true);
      await promptAsync();
    };
  
    const signInWithApple = async () => {
      setIsAuthProcessing(true);
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        // Gửi thông tin nhận được về backend
        const backendResponse = await api.post('/api/auth/apple/mobile', {
          identity_token: credential.identityToken,
          full_name: credential.fullName ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim() : null,
          email: credential.email
        });

        const { access_token, refresh_token } = backendResponse.data;
        await handleSuccessfulLogin(access_token, refresh_token);

      } catch (e: any) {
        setIsAuthProcessing(false); // Rất quan trọng: tắt loading khi có lỗi
        if (e.code === 'ERR_REQUEST_CANCELED') {
          // Người dùng đã chủ động hủy, không cần thông báo lỗi
          console.log('Apple Sign-In was canceled by the user.');
        } else {
          // Các lỗi khác
          const friendlyError = translateApiError(e);
          Alert.alert(
            i18n.t('signin_page.title'), 
            i18n.t('signin_page.status.apple_oauth_error', { detail: friendlyError })
          );
        }
      }
    };

    const refreshUser = async () => {
      try {
          const userResponse = await api.get('/api/users/me');
          setUser(userResponse.data);
          return userResponse.data;
      } catch (error: any) {
          if ((error as any).response?.status === 401) {await signOut(); }
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
            Alert.alert(i18n.t('pin_modal.header'), translateApiError(error),
                [{ text: 'OK', onPress: () => pinModalRef.current?.resetPin() }]
            );
        } finally {
            setIsVerifyingPin(false);
        }
    };
  
    const value = { signIn, signInWithGoogle, signInWithApple, signOut, user, isLoading, isAuthenticated: authState.isAuthenticated, isAuthProcessing, refreshUser, isPremium, isRevenueCatReady };
    
    const styles = StyleSheet.create({
        lockScreenContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: themeColors.background,
        },
        overlay: {
            ...StyleSheet.absoluteFillObject,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: themeColors.background,
            zIndex: 10,
        }
    });

    return (
      <AuthContext.Provider value={value}>
        {children}
        {(isLoading || !isRevenueCatReady) && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={themeColors.tint} />
          </View>
        )}

        {authState.isAuthenticated && isAppLocked && (
          <View style={styles.overlay}>
            <PinModal
              ref={pinModalRef}
              isVisible={pinModalVisible}
              onClose={handlePinClose}
              onSubmit={handlePinSubmit}
              promptText={i18n.t('pin_modal.prompt_security_verification')}
            />
            {!pinModalVisible && <ActivityIndicator size="large" color={themeColors.tint} />}
          </View>
        )}
      </AuthContext.Provider>
    );
};