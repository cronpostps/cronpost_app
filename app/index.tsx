// app/index.tsx
// Version: 1.4.0

import { Link } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { Colors } from '../src/constants/Colors';
import { useAuth } from '../src/store/AuthContext';
import { translateApiError } from '../src/utils/errorTranslator';

const LoginScreen = () => {
  const { t } = useTranslation();
  // Lấy hàm signInWithGoogle từ AuthContext
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

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

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      // Gọi hàm đăng nhập Google
      await signInWithGoogle();
    } catch (err: any) {
      const friendlyError = translateApiError(err);
      setError(friendlyError);
      Alert.alert(t('errors.access_denied'), friendlyError);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    innerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: { fontSize: 28, fontWeight: 'bold', marginBottom: 40, textAlign: 'center', color: themeColors.text },
    input: { width: '80%', height: 50, backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, marginBottom: 20, fontSize: 16, color: themeColors.text },
    button: { marginTop: 20, backgroundColor: themeColors.buttonBackground, paddingVertical: 15, borderRadius: 8, width: '80%', alignItems: 'center', opacity: isLoading ? 0.7 : 1 },
    buttonText: { color: themeColors.buttonText, fontSize: 16, fontWeight: 'bold' },
    linkContainer: { marginTop: 30, flexDirection: 'row' },
    linkText: { color: themeColors.tint, fontSize: 16 },
    promptText: { color: themeColors.text, fontSize: 16 },
    errorText: { marginTop: 20, color: 'red', textAlign: 'center' },
    // === STYLES MỚI CHO NÚT GOOGLE VÀ DẢI PHÂN CÁCH ===
    orSeparatorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, width: '80%' },
    separatorLine: { flex: 1, height: 1, backgroundColor: themeColors.inputBorder },
    orSeparatorText: { marginHorizontal: 10, color: themeColors.text },
    googleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 12, borderRadius: 8, width: '80%', justifyContent: 'center', borderWidth: 1, borderColor: '#DDDDDD' },
    googleIcon: { width: 24, height: 24, marginRight: 15 },
    googleButtonText: { color: '#333333', fontSize: 16, fontWeight: '500' },
  });

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.innerContainer}>
        <Text style={styles.header}>{t('signin_page.header')}</Text>
        
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder={t('signin_page.email_label')} placeholderTextColor={themeColors.icon} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder={t('signin_page.password_label')} placeholderTextColor={themeColors.icon} secureTextEntry />
        
        {isLoading ? <ActivityIndicator size="large" color={themeColors.tint} /> : <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}><Text style={styles.buttonText}>{t('header_static.signin')}</Text></TouchableOpacity>}
        {error && <Text style={styles.errorText}>{error}</Text>}
        
        {/* === DẢI PHÂN CÁCH "OR" === */}
        <View style={styles.orSeparatorContainer}>
          <View style={styles.separatorLine} />
          <Text style={styles.orSeparatorText}>{t('signin_page.or_separator')}</Text>
          <View style={styles.separatorLine} />
        </View>

        {/* === NÚT ĐĂNG NHẬP GOOGLE === */}
        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
          {/* === FIX: Use a new, reliable image URL === */}
          <Image source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }} style={styles.googleIcon} />
          <Text style={styles.googleButtonText}>{t('signin_page.google_alt')}</Text>
        </TouchableOpacity>
        
        {/* Liên kết đến trang Đăng ký */}
        <View style={styles.linkContainer}>
          <Text style={styles.promptText}>{t('signin_page.prompt_signup')} </Text>
          <Link href="/signup"><Text style={styles.linkText}>{t('signin_page.link_signup')}</Text></Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;