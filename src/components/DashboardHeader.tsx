// src/components/DashboardHeader.tsx
// Version: 3.0.1

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import api from '../api/api';
import { Colors } from '../constants/Colors';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';

const formatDate = (date: Date, formatPreference: string) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    switch (formatPreference) {
        case 'mm/dd/yyyy': return `${month}/${day}/${year}`;
        case 'yyyy/mm/dd': return `${year}/${month}/${day}`;
        default: return `${day}/${month}/${year}`;
    }
};

const formatGmtString = (offsetSeconds: number) => {
    const offsetHours = Math.floor(Math.abs(offsetSeconds) / 3600);
    const offsetMinutes = Math.floor((Math.abs(offsetSeconds) % 3600) / 60);
    const sign = offsetSeconds >= 0 ? '+' : '-';
    return `[GMT${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}]`;
};

export const DashboardHeader = () => {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { user } = useAuth();
    const themeColors = Colors[theme];

    const [displayTime, setDisplayTime] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const userName = user?.user_name || user?.email || '';
    const status = user?.account_status || '...';
    const timezone = user?.timezone;
    const dateFormat = user?.date_format || 'dd/mm/yyyy';

    useEffect(() => {
        let clockInterval: any;
        setIsLoading(true);

        if (!timezone) {
            setDisplayTime('Timezone not set');
            setIsLoading(false);
            return;
        }

        const fetchInitialTime = async () => {
            try {
                const response = await api.get(`/api/users/time/now?tz=${timezone}`);
                const { utc_timestamp, offset_seconds } = response.data;
                
                const serverTimeAtFetch = utc_timestamp * 1000;
                const clientTimeAtFetch = Date.now();

                clockInterval = setInterval(() => {
                    const elapsed = Date.now() - clientTimeAtFetch;
                    const now = new Date(serverTimeAtFetch + elapsed);
                    const userTime = new Date(now.getTime() + offset_seconds * 1000);
                    
                    const dateString = formatDate(userTime, dateFormat);
                    const timeString = userTime.toLocaleTimeString('en-GB', { timeZone: 'UTC' });
                    const gmtString = formatGmtString(offset_seconds);

                    setDisplayTime(`${dateString} - ${timeString} ${gmtString}`);
                }, 1000);

            } catch (error) {
                console.error("Failed to fetch time info:", error);
                setDisplayTime('Error loading time');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialTime();

        return () => clearInterval(clockInterval);
    }, [timezone, dateFormat]);

    const statusText = t(`dashboard_page.status_${status.toLowerCase()}`);

    const styles = StyleSheet.create({
        headerContainer: { position: 'absolute', top: 20, left: 20, right: 20, alignItems: 'center' },
        welcomeText: { fontSize: 22, fontWeight: 'bold', color: themeColors.text },
        statusText: { fontSize: 16, color: themeColors.text, marginTop: 8 },
        timeText: { fontSize: 14, color: themeColors.icon, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
    });

    return (
        <View style={styles.headerContainer}>
            <Text style={styles.welcomeText}>{t('dashboard_page.welcome', { name: userName })}</Text>
            <Text style={styles.statusText}>
                {t('dashboard_page.current_status_label')} <Text style={{ fontWeight: 'bold' }}>{statusText}</Text>
            </Text>
            {isLoading ? <ActivityIndicator style={{ marginTop: 4 }} color={themeColors.icon} /> : <Text style={styles.timeText}>{displayTime}</Text>}
        </View>
    );
};