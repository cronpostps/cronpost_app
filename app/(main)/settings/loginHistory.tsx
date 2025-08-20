// app/(main)/settings/loginHistory.tsx
// Version 1.0.0

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useTheme } from '../../../src/store/ThemeContext';

type HistoryItem = {
  id: string;
  device_os: string;
  login_time: string;
  ip_address: string;
};

export default function LoginHistoryScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/api/users/access-history');
        setHistory(response.data);
      } catch (err) {
        setError(t('login_history_page.error_loading'));
        console.error("Failed to fetch login history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [t]);

  const getDeviceIcon = (os: string) => {
    if (!os) return 'help-circle-outline';
    const lowerOs = os.toLowerCase();
    if (lowerOs.includes('android')) return 'logo-android';
    if (lowerOs.includes('ios') || lowerOs.includes('mac')) return 'logo-apple';
    if (lowerOs.includes('windows')) return 'logo-windows';
    if (lowerOs.includes('linux')) return 'logo-tux';
    return 'desktop-outline';
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <View style={styles.itemContainer}>
      <Ionicons name={getDeviceIcon(item.device_os)} size={24} color={themeColors.text} style={styles.icon} />
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemDevice}>{item.device_os || 'Unknown Device'}</Text>
        <Text style={styles.itemDetails}>
          {new Date(item.login_time).toLocaleString()} • {item.ip_address}
        </Text>
      </View>
    </View>
  );

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder },
    icon: { marginRight: 15 },
    itemTextContainer: { flex: 1 },
    itemDevice: { fontSize: 16, fontWeight: 'bold', color: themeColors.text },
    itemDetails: { fontSize: 14, color: themeColors.icon, marginTop: 2 },
    emptyText: { textAlign: 'center', marginTop: 50, color: themeColors.icon, fontSize: 16 },
  });

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={themeColors.tint} /></View>;
  }
  
  if (error) {
    return <View style={styles.container}><Text style={styles.emptyText}>{error}</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.login_time}-${index}`}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('login_history_page.empty_list')}</Text>}
      />
    </SafeAreaView>
  );
}