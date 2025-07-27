// app/signup.tsx
// Version: 1.1.0

import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import api from '../src/api/api';
import { Colors } from '../src/constants/Colors';
import { useAuth } from '../src/store/AuthContext'; // Import useAuth
import { translateApiError } from '../src/utils/errorTranslator';

const SignUpScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { signInWithGoogle } = useAuth(); // Get signInWithGoogle
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

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

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    innerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: { fontSize: 28, fontWeight: 'bold', marginBottom: 40, textAlign: 'center', color: themeColors.text },
    input: { width: '80%', height: 50, backgroundColor: themeColors.inputBackground, borderColor: themeColors.inputBorder, borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, marginBottom: 20, fontSize: 16, color: themeColors.text },
    button: { marginTop: 20, backgroundColor: '#28a745', paddingVertical: 15, borderRadius: 8, width: '80%', alignItems: 'center', opacity: isLoading ? 0.7 : 1 },
    buttonText: { color: themeColors.buttonText, fontSize: 16, fontWeight: 'bold' },
    linkContainer: { marginTop: 30 },
    linkText: { color: themeColors.tint, fontSize: 16 },
    errorText: { marginTop: 20, color: 'red', textAlign: 'center' },
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
        <Text style={styles.header}>{t('signup_page.header')}</Text>

        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder={t('signup_page.email_label')} placeholderTextColor={themeColors.icon} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder={t('signup_page.password_label')} placeholderTextColor={themeColors.icon} secureTextEntry />
        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t('signup_page.confirm_password_label')} placeholderTextColor={themeColors.icon} secureTextEntry />

        {isLoading ? <ActivityIndicator size="large" color={themeColors.tint} /> : <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={isLoading}><Text style={styles.buttonText}>{t('signup_page.btn_create')}</Text></TouchableOpacity>}
        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.orSeparatorContainer}>
          <View style={styles.separatorLine} />
          <Text style={styles.orSeparatorText}>{t('signin_page.or_separator')}</Text>
          <View style={styles.separatorLine} />
        </View>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
          <Image source={{ uri: 'https://i.ibb.co/j82b22b/g-logo.png' }} style={styles.googleIcon} onError={(e) => console.log('Failed to load image', e.nativeEvent.error)} />
          <Text style={styles.googleButtonText}>{t('header_static.signup')} with Google</Text>
        </TouchableOpacity>

        <View style={styles.linkContainer}>
          <Link href="/"><Text style={styles.linkText}>{t('signup_page.link_signin')}</Text></Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default SignUpScreen;