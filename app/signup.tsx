// app/signup.tsx
// Version: 1.3.1

import * as AppleAuthentication from 'expo-apple-authentication';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import api from '../src/api/api';
import { Colors } from '../src/constants/Colors';
import { useAuth } from '../src/store/AuthContext';
import { useTheme } from '../src/store/ThemeContext';
import { translateApiError } from '../src/utils/errorTranslator';

const SignUpScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { signInWithGoogle, signInWithApple, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const themeColors = Colors[theme];

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      const errorMessage = t('signup_page.error_passwords_mismatch');
      setError(errorMessage);
      Alert.alert(t('signup_page.header'), errorMessage);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await api.post('/api/auth/signup', { email, password });
      
      Alert.alert(
        t('signup_page.header'),
        t('signup_page.success_message'),
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );

    } catch (err: any) {
      const friendlyError = translateApiError(err);
      setError(friendlyError);
      Alert.alert(t('signup_page.header'), friendlyError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);
  
  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const friendlyError = translateApiError(err);
      setError(friendlyError);
      Alert.alert(t('errors.access_denied'), friendlyError);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    try {
      await signInWithApple();
    } catch (err: any) {
      // The error alert is already handled in AuthContext
      console.error("Apple sign-in error on signup screen:", err);
    }
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
      backgroundColor: '#28a745',
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
    linkText: {
      color: themeColors.tint,
      fontSize: 16,
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
            <Text style={styles.subHeaderText}>{t('signup_page.header')}</Text>
          </View>

          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('signup_page.email_label')}
            placeholderTextColor={themeColors.icon}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t('signup_page.password_label')}
            placeholderTextColor={themeColors.icon}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('signup_page.confirm_password_label')}
            placeholderTextColor={themeColors.icon}
            secureTextEntry
          />

          {isLoading ? (
            <ActivityIndicator size="large" color={themeColors.tint} style={{ marginTop: 10 }} />
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={isLoading}>
              <Text style={styles.buttonText}>{t('signup_page.btn_create')}</Text>
            </TouchableOpacity>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.orSeparatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.orSeparatorText}>{t('signin_page.or_separator')}</Text>
            <View style={styles.separatorLine} />
          </View>

          <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
            <Image
              source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
              style={styles.googleIcon}
            />
            <Text style={styles.googleButtonText}>{t('header_static.signup')} with Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
              buttonStyle={theme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={{ width: '100%', height: 50, marginTop: 15 }}
              onPress={handleAppleSignIn}
            />
          )}
          
          <View style={styles.footerContainer}>
            <Link href="/">
              <Text style={styles.linkText}>{t('signup_page.link_signin')}</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignUpScreen;
