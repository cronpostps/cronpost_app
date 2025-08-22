// app/index.tsx
// Version: 1.6.0

import { Link } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import LanguagePicker from '../src/components/LanguagePicker';
import { Colors } from '../src/constants/Colors';
import { useAuth } from '../src/store/AuthContext';
import { useTheme } from '../src/store/ThemeContext';
import { translateApiError } from '../src/utils/errorTranslator';

const moonIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
</svg>
`;
const sunIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="5"></circle>
  <line x1="12" y1="1" x2="12" y2="3"></line>
  <line x1="12" y1="21" x2="12" y2="23"></line>
  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
  <line x1="1" y1="12" x2="3" y2="12"></line>
  <line x1="21" y1="12" x2="23" y2="12"></line>
  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
</svg>
`;
const globeIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <line x1="2" y1="12" x2="22" y2="12"></line>
  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
</svg>
`;

const LoginScreen = () => {
  const { t, i18n } = useTranslation();
  const { signIn, signInWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const themeColors = Colors[theme];

  const [isLanguagePickerVisible, setLanguagePickerVisible] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err: any) {
      const friendlyError = translateApiError(err);
      setError(friendlyError);
      Alert.alert(t('errors.access_denied'), friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  // const handleGoogleSignIn = async () => {
  //   setError(null);
  //   try {
  //     await signInWithGoogle();
  //   } catch (err: any) {
  //     const friendlyError = translateApiError(err);
  //     setError(friendlyError);
  //     Alert.alert(t('errors.access_denied'), friendlyError);
  //   }
  // };
  // HÀM ĐÃ CẬP NHẬT
  const handleGoogleSignIn = async () => {
    // Ngăn người dùng nhấn nhiều lần
    if (isLoading) return; 

    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const friendlyError = translateApiError(err);
      setError(friendlyError);
      Alert.alert(t('errors.access_denied'), friendlyError);
      setIsLoading(false); // Đảm bảo tắt loading khi có lỗi
    } 
    // Không cần finally setIsLoading(false) ở đây,
    // vì sau khi xác thực thành công, app sẽ chuyển màn hình.
    // AuthContext sẽ xử lý việc tắt loading nếu cần.
  };

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
    },
    headerContainer: {
      alignItems: 'center',
      marginBottom: 40,
    },
    logoText: {
      fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
      fontSize: 48,
      fontWeight: 'bold',
      color: themeColors.tint,
    },
    subHeaderText: {
      fontSize: 16,
      color: themeColors.text,
      marginTop: 8,
    },
    input: {
      width: '100%',
      height: 50,
      backgroundColor: themeColors.inputBackground,
      borderColor: themeColors.inputBorder,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 15,
      marginBottom: 15,
      fontSize: 16,
      color: themeColors.text,
    },
    button: {
      backgroundColor: themeColors.buttonBackground,
      paddingVertical: 15,
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
      marginTop: 10,
      opacity: isLoading ? 0.7 : 1,
    },
    buttonText: {
      color: themeColors.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
    },
    errorText: {
      marginTop: 15,
      color: 'red',
      textAlign: 'center',
    },
    orSeparatorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
      width: '100%',
    },
    separatorLine: {
      flex: 1,
      height: 1,
      backgroundColor: themeColors.inputBorder,
    },
    orSeparatorText: {
      marginHorizontal: 10,
      color: themeColors.text,
    },
    googleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      paddingVertical: 12,
      borderRadius: 8,
      width: '100%',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#DDDDDD',
    },
    googleIcon: {
      width: 24,
      height: 24,
      marginRight: 15,
    },
    googleButtonText: {
      color: '#333333',
      fontSize: 16,
      fontWeight: '500',
    },
    footerContainer: {
      marginTop: 30,
      alignItems: 'center',
    },
    linkContainer: {
      flexDirection: 'row',
      marginBottom: 20,
    },
    linkText: {
      color: themeColors.tint,
      fontSize: 16,
    },
    promptText: {
      color: themeColors.text,
      fontSize: 16,
    },
    settingsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
    },
    settingText: {
      marginLeft: 8,
      color: themeColors.text,
      fontSize: 16,
    },
    forgotPasswordContainer: {
      width: '100%',
      alignItems: 'flex-end',
      marginBottom: 10,
    },
    forgotPasswordText: {
      color: themeColors.tint,
      fontSize: 14,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.logoText}>CronPost</Text>
            <Text style={styles.subHeaderText}>{t('signin_page.header')}</Text>
          </View>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('signin_page.email_label')}
            placeholderTextColor={themeColors.icon}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t('signin_page.password_label')}
            placeholderTextColor={themeColors.icon}
            secureTextEntry
          />
          <View style={styles.forgotPasswordContainer}>
            <Link href="/forgot-password">
              <Text style={styles.forgotPasswordText}>{t('signin_page.link_forgot_password')}</Text>
            </Link>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={themeColors.tint} style={{ marginTop: 10 }} />
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
              <Text style={styles.buttonText}>{t('header_static.signin')}</Text>
            </TouchableOpacity>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.orSeparatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.orSeparatorText}>{t('signin_page.or_separator')}</Text>
            <View style={styles.separatorLine} />
          </View>

          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn} disabled={isLoading}>
            <Image
              source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>{t('signin_page.google_alt')}</Text>
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <View style={styles.linkContainer}>
              <Text style={styles.promptText}>{t('signin_page.prompt_signup')} </Text>
              <Link href="/signup">
                <Text style={styles.linkText}>{t('signin_page.link_signup')}</Text>
              </Link>
            </View>

            <View style={styles.settingsContainer}>
               <TouchableOpacity style={styles.settingButton} onPress={() => setLanguagePickerVisible(true)}>
                <SvgXml xml={globeIcon} width="20" height="20" stroke={themeColors.text} />
                <Text style={styles.settingText}>{i18n.language.toUpperCase()}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingButton} onPress={toggleTheme}>
                <SvgXml xml={theme === 'dark' ? sunIcon : moonIcon} width="20" height="20" stroke={themeColors.text} />
                <Text style={styles.settingText}>
                  {t(theme === 'dark' ? 'themes.light' : 'themes.dark')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
            <LanguagePicker
              isVisible={isLanguagePickerVisible}
              onClose={() => setLanguagePickerVisible(false)}
            />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
