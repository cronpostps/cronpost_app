// app/(main)/settings/delete-account.tsx
// version: 1.0.0

import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity
} from 'react-native';
import api from '../../../src/api/api';
import PinModal, { PinModalRef } from '../../../src/components/PinModal';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

const DeleteAccountScreen = () => {
    const { t } = useTranslation();
    const { user, signOut } = useAuth();
    const { theme } = useTheme();
    const themeColors = Colors[theme];

    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isPinModalVisible, setPinModalVisible] = useState(false);
    const pinModalRef = useRef<PinModalRef>(null);

    const handleFinalDeletion = async (pinCode?: string) => {
        setIsLoading(true);
        try {
            const payload = {
                password: password,
                pin_code: pinCode,
            };
            await api.delete('/api/users/me/delete-account', { data: payload });
            
            Alert.alert(
                t('confirm_modal.default_title'),
                t('delete_account_page.success_body')
            );
            await signOut();
            router.replace('/'); 

        } catch (error) {
            Alert.alert(t('errors.title_error'), translateApiError(error));
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDeletePress = () => {
        if (!password) {
            Alert.alert(t('errors.title_error'), t('errors.error_password_required'));
            return;
        }

        Alert.alert(
            t('confirm_modal.default_title'),
            t('delete_account_page.confirm_delete_body'),
            [
                { text: t('confirm_modal.btn_cancel'), style: 'cancel' },
                {
                    text: t('confirm_modal.btn_confirm'),
                    style: 'destructive',
                    onPress: () => {
                        if (user?.has_pin) {
                            setPinModalVisible(true);
                        } else {
                            handleFinalDeletion();
                        }
                    },
                },
            ]
        );
    };

    const handlePinSubmit = (pin: string) => {
        setPinModalVisible(false);
        handleFinalDeletion(pin);
    };

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: themeColors.background },
        scrollContainer: { padding: 20, paddingTop: 30 },
        title: { fontSize: 24, fontWeight: 'bold', color: themeColors.text, marginBottom: 10, textAlign: 'center' },
        warningText: { fontSize: 16, color: themeColors.icon, textAlign: 'center', marginBottom: 30, paddingHorizontal: 10 },
        label: { fontSize: 16, marginBottom: 8, color: themeColors.text },
        input: { height: 45, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 10, fontSize: 16, color: themeColors.text, backgroundColor: themeColors.inputBackground, marginBottom: 20 },
        deleteButton: { backgroundColor: '#ff453a', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
        deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    });

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Text style={styles.title}>{t('delete_account_page.title')}</Text>
                <Text style={styles.warningText}>{t('delete_account_page.warning_text')}</Text>
                
                <Text style={styles.label}>{t('signin_page.password_label')}</Text>
                <TextInput
                    style={styles.input}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    placeholderTextColor={themeColors.icon}
                    autoCapitalize="none"
                />

                <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePress} disabled={isLoading}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteButtonText}>{t('delete_account_page.title')}</Text>}
                </TouchableOpacity>
            </ScrollView>

            <PinModal
                ref={pinModalRef}
                isVisible={isPinModalVisible}
                onClose={() => setPinModalVisible(false)}
                onSubmit={handlePinSubmit}
                promptText={t('delete_account_page.pin_prompt')}
            />
        </SafeAreaView>
    );
};

export default DeleteAccountScreen;