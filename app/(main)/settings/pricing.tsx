// app/(main)/settings/pricing.tsx
// Version: 3.4.1

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import apiClient from '../../../src/api/api';
import { revenueCatConfig } from '../../../src/config/revenueCatConfig';
import { Colors, Theme } from '../../../src/constants/Colors';
import i18n from '../../../src/locales/i18n';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';

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

const PricingScreen = () => {
    const { theme } = useTheme();
    const { user, isPremium, isRevenueCatReady } = useAuth();
    const themeColors = Colors[theme];
    const styles = makeStyles(themeColors);

    const [loading, setLoading] = useState(true);
    const [pricingData, setPricingData] = useState<PublicPricingData | null>(null);
    
    const [offering, setOffering] = useState<PurchasesOffering | null>(null);
    const [isPurchasing, setIsPurchasing] = useState(false);

    useEffect(() => {
        const fetchOfferings = async () => {
            setLoading(true);
            try {
                const offerings = await Purchases.getOfferings();
                if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
                    setOffering(offerings.current);
                }
            } catch (e) {
                console.error("Error fetching offerings: ", e);
                Alert.alert("Error", "Could not fetch available products.");
            } finally {
                setLoading(false);
            }
        };

        const fetchStaticPricing = async () => {
            try {
                const pricingResponse = await apiClient.get('api/users/public/pricing-details');
                setPricingData(pricingResponse.data);
            } catch (error) {
                console.error("Failed to load static pricing data", error);
            }
        };

        if (isRevenueCatReady) {
            fetchOfferings();
        }
        fetchStaticPricing();
    }, [isRevenueCatReady]);

    const handleUpgrade = async () => {
        if (!user) {
            console.log("User is a guest, navigate to auth flow");
            Alert.alert("Login Required", "Please sign in or create an account to upgrade.");
            return;
        }

        if (!offering?.availablePackages[0]) {
            console.error("No products available for purchase.");
            Alert.alert("Error", "No products available for purchase at this moment.");
            return;
        }

        setIsPurchasing(true);
        try {
            const packageToPurchase = offering.availablePackages[0];
            const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
            if (typeof customerInfo.entitlements.active[revenueCatConfig.entitlementId] !== 'undefined') {
                Alert.alert("Success!", "You are now a Premium user.");
            }
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error("Purchase error:", e);
                Alert.alert("Error", "An error occurred during the purchase. Please try again.");
            }
        } finally {
            setIsPurchasing(false);
        }
    };

    if (loading) {
        return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color={themeColors.primary} /></SafeAreaView>;
    }

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
                            offering?.availablePackages[0]?.product.priceString
                            ? `${offering.availablePackages[0].product.priceString} / ${i18n.t('pricing_page.price_lifetime')}`
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
                    {isPremium ? (
                        <Text style={styles.premiumText}>{i18n.t('pricing_page.btn_already_premium')}</Text>
                    ) : (
                        <Pressable 
                            style={[styles.upgradeButton, isPurchasing && styles.disabledButton]} 
                            onPress={handleUpgrade}
                            disabled={isPurchasing}
                        >
                            {isPurchasing 
                                ? <ActivityIndicator color="#fff" />
                                : <Text style={styles.upgradeButtonText}>{i18n.t('pricing_page.btn_upgrade')}</Text>
                            }
                        </Pressable>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

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
    disabledButton: {
        backgroundColor: '#a5d6a7',
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