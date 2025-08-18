// app/(main)/settings/pricing.tsx
// Version: 3.3.0 (Added robust data validation before render)

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import apiClient from '../../../src/api/api';
import { Colors, Theme } from '../../../src/constants/Colors';
import i18n from '../../../src/locales/i18n';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';


// --- Interfaces for Type Safety ---
interface PricingTierDetails {
    active_messages: number;
    stored_messages: number;
    max_chars: number;
    recipients_cp_email: number;
    recipients_smtp: number;
    recipients_in_app: number;
    storage_gb?: number;
    max_email_size_mb?: number;
    file_attachments: boolean;
    in_app_retention_days: number;
}

interface PublicPricingData {
    premium_price_usd: number;
    free: PricingTierDetails;
    premium: PricingTierDetails;
}

// --- Helper for formatting values ---
const formatValue = (value?: number | boolean | string, type: 'number' | 'storage' | 'email_size' | 'attachments' | 'text' = 'text') => {
    if (value === null || typeof value === 'undefined') return '-';
    switch (type) {
        case 'number':
            return (value as number).toLocaleString('en-US');
        case 'storage':
            return `${value} GB`;
        case 'email_size':
            return `< ${value}MB`;
        case 'attachments':
            return value ? '✅' : '❌';
        default:
            return value.toString();
    }
};

// --- Reusable Components for the table ---
const PricingGroupHeader = ({ titleKey }: { titleKey: string }) => {
    const { theme } = useTheme();
    const styles = makeStyles(Colors[theme]);
    return <Text style={styles.groupHeader}>{i18n.t(titleKey)}</Text>;
};

const PricingRow = ({ labelKey, freeValue, premiumValue }: { labelKey: string, freeValue: string, premiumValue: string }) => {
    const { theme } = useTheme();
    const styles = makeStyles(Colors[theme]);
    return (
        <View style={styles.row}>
            <Text style={styles.cellLabel}>{i18n.t(labelKey)}</Text>
            <Text style={styles.cellValue}>{freeValue}</Text>
            <Text style={[styles.cellValue, styles.cellPremium]}>{premiumValue}</Text>
        </View>
    );
};

// --- Main Pricing Screen Component ---
const PricingScreen = () => {
    const { theme } = useTheme();
    const { authState } = useAuth();
    const themeColors = Colors[theme];
    const styles = makeStyles(themeColors);

    const [loading, setLoading] = useState(true);
    const [pricingData, setPricingData] = useState<PublicPricingData | null>(null);
    const [userMembership, setUserMembership] = useState<'free' | 'premium' | 'guest'>('guest');
    
    const fetchUserData = useCallback(async () => {
        if (authState?.token) {
            try {
                const { data } = await apiClient.get('api/users/me');
                setUserMembership(data.membership_type || 'free');
            } catch (error) {
                console.error("Failed to fetch user membership status:", error);
                setUserMembership('free');
            }
        } else {
            setUserMembership('guest');
        }
    }, [authState?.token]);
    
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const pricingPromise = apiClient.get('api/users/public/pricing-details');
                const userPromise = fetchUserData();
                
                const [pricingResponse] = await Promise.all([pricingPromise, userPromise]);
                
                setPricingData(pricingResponse.data);
            } catch (error) {
                console.error("Failed to load pricing data", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [fetchUserData]);

    const handleUpgrade = () => {
        if (userMembership === 'guest') {
            // TODO: Navigate to Login/Signup Screen
            console.log("User is a guest, navigate to auth flow");
        } else {
            // TODO: Initiate In-App Purchase flow with RevenueCat
            console.log("User is free, initiating RevenueCat purchase flow");
        }
    };

    if (loading) {
        return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color={themeColors.primary} /></SafeAreaView>;
    }

    // Sửa lỗi: Thêm điều kiện kiểm tra `free` và `premium` để đảm bảo dữ liệu đầy đủ
    if (!pricingData || !pricingData.free || !pricingData.premium) {
        return <SafeAreaView style={styles.container}><Text style={styles.text}>{i18n.t('errors.page_load_failed')}</Text></SafeAreaView>;
    }
    
    const { free, premium } = pricingData;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>{i18n.t('pricing_page.hero_h1')}</Text>
                <Text style={styles.subtitle}>{i18n.t('pricing_page.hero_p')}</Text>
                
                <View style={styles.table}>
                    <View style={styles.rowHeader}>
                        <Text style={[styles.cellHeader, styles.cellLabel]}>{i18n.t('pricing_page.th_features')}</Text>
                        <Text style={styles.cellHeader}>{i18n.t('pricing_page.th_free')}</Text>
                        <Text style={styles.cellHeader}>{i18n.t('pricing_page.th_premium')}</Text>
                    </View>

                    <PricingGroupHeader titleKey="pricing_page.group_core" />
                    <PricingRow
                        labelKey="pricing_page.feature_price"
                        freeValue={i18n.t('pricing_page.price_free')}
                        premiumValue={
                            typeof pricingData.premium_price_usd === 'number'
                                ? `$${pricingData.premium_price_usd.toFixed(2)} / ${i18n.t('pricing_page.price_lifetime')}`
                                : '...'
                        }
                    />
                    <PricingRow labelKey="pricing_page.feature_checkin" freeValue={i18n.t('pricing_page.checkin_free')} premiumValue={i18n.t('pricing_page.checkin_premium')} />
                    <PricingRow labelKey="pricing_page.feature_active_msg" freeValue={formatValue(free.active_messages, 'number')} premiumValue={formatValue(premium.active_messages, 'number')} />
                    <PricingRow labelKey="pricing_page.feature_stored_msg" freeValue={formatValue(free.stored_messages, 'number')} premiumValue={formatValue(premium.stored_messages, 'number')} />

                    <PricingGroupHeader titleKey="pricing_page.group_messaging" />
                    <PricingRow labelKey="pricing_page.feature_max_chars" freeValue={formatValue(free.max_chars, 'number')} premiumValue={formatValue(premium.max_chars, 'number')} />
                    <PricingRow labelKey="pricing_page.feature_recipients_cronpost" freeValue={formatValue(free.recipients_cp_email, 'number')} premiumValue={formatValue(premium.recipients_cp_email, 'number')} />
                    <PricingRow labelKey="pricing_page.feature_recipients_smtp" freeValue={formatValue(free.recipients_smtp, 'number')} premiumValue={formatValue(premium.recipients_smtp, 'number')} />
                    <PricingRow labelKey="pricing_page.feature_recipients_inapp" freeValue={formatValue(free.recipients_in_app, 'number')} premiumValue={formatValue(premium.recipients_in_app, 'number')} />
                    <PricingRow labelKey="pricing_page.feature_storage" freeValue={formatValue(free.storage_gb, 'storage')} premiumValue={formatValue(premium.storage_gb, 'storage')} />
                    <PricingRow labelKey="pricing_page.feature_max_email_size" freeValue={i18n.t('pricing_page.email_size_free')} premiumValue={formatValue(premium.max_email_size_mb, 'email_size')} />
                    <PricingRow labelKey="pricing_page.feature_attachments" freeValue={formatValue(free.file_attachments, 'attachments')} premiumValue={formatValue(premium.file_attachments, 'attachments')} />

                    <PricingGroupHeader titleKey="pricing_page.group_account" />
                    <PricingRow labelKey="pricing_page.feature_inapp_retention" freeValue={formatValue(free.in_app_retention_days)} premiumValue={formatValue(premium.in_app_retention_days)} />
                    <PricingRow labelKey="pricing_page.feature_inactive_deletion" freeValue={i18n.t('pricing_page.deletion_free')} premiumValue={i18n.t('pricing_page.deletion_premium')} />
                </View>

                <View style={styles.buttonContainer}>
                    {userMembership === 'premium' ? (
                        <Text style={styles.premiumText}>{i18n.t('pricing_page.btn_already_premium')}</Text>
                    ) : (
                        <Pressable style={styles.upgradeButton} onPress={handleUpgrade}>
                            <Text style={styles.upgradeButtonText}>{i18n.t('pricing_page.btn_upgrade')}</Text>
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

// --- Stylesheet ---
const makeStyles = (themeColors: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: themeColors.background,
    },
    scrollContent: {
        padding: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: themeColors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: themeColors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    table: {
        borderWidth: 1,
        borderColor: themeColors.border,
        borderRadius: 8,
        backgroundColor: themeColors.card,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: themeColors.border,
    },
    rowHeader: {
        flexDirection: 'row',
        backgroundColor: themeColors.background,
    },
    cellLabel: {
        flex: 2,
        padding: 12,
        fontSize: 14,
        color: themeColors.text,
        fontWeight: '500',
    },
    cellValue: {
        flex: 1,
        padding: 12,
        fontSize: 14,
        color: themeColors.text,
        textAlign: 'center',
    },
    cellPremium: {
        fontWeight: 'bold',
        color: themeColors.primary,
    },
    cellHeader: {
        flex: 1,
        padding: 12,
        fontWeight: 'bold',
        color: themeColors.text,
        textAlign: 'center',
    },
    groupHeader: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: themeColors.background,
        color: themeColors.textSecondary,
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    buttonContainer: {
        marginTop: 24,
        paddingHorizontal: 8,
    },
    upgradeButton: {
        backgroundColor: '#28a745',
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    upgradeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    premiumText: {
        textAlign: 'center',
        color: themeColors.primary,
        fontSize: 16,
        fontWeight: 'bold',
        padding: 15,
    },
    text: {
      fontSize: 18,
      color: themeColors.text,
      textAlign: 'center'
    },
});

export default PricingScreen;