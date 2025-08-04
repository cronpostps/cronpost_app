// app/forgot-password.tsx

import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
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
import { useTheme } from '../src/store/ThemeContext';
import { translateApiError } from '../src/utils/errorTranslator';

const ForgotPasswordScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const themeColors = Colors[theme];

  const handlePasswordReset = async () => {
    setIsLoading(true);
    try {
      // Logic mobile không cần captchaToken
      await api.post('/api/auth/request-password-reset', { email });
      
      Alert.alert(
        t('forgot_password_page.title'),
        t('forgot_password_page.success_message'),
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (err: any) {
      const friendlyError = translateApiError(err);
      Alert.alert(t('errors.generic', { message: '' }), friendlyError);
    } finally {
      setIsLoading(false);
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
    headerText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: themeColors.text,
    },
    subHeaderText: {
      fontSize: 16,
      color: themeColors.text,
      marginTop: 8,
      textAlign: 'center',
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
    },
    buttonText: {
      color: themeColors.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
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
            <Text style={styles.headerText}>{t('forgot_password_page.header')}</Text>
            <Text style={styles.subHeaderText}>{t('forgot_password_page.subheader')}</Text>
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

          {isLoading ? (
            <ActivityIndicator size="large" color={themeColors.tint} style={{ marginTop: 10 }} />
          ) : (
            <TouchableOpacity style={styles.button} onPress={handlePasswordReset}>
              <Text style={styles.buttonText}>{t('forgot_password_page.btn_send_link')}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.footerContainer}>
             <Link href="/">
                <Text style={styles.linkText}>{t('forgot_password_page.back_to_signin')}</Text>
              </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;