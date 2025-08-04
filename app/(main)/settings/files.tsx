// app/(main)/settings/files.tsx

import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
// Thêm import cho GestureHandlerRootView
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function FileManagementScreen() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { user, refreshUser } = useAuth();
    const themeColors = Colors[theme];
    const router = useRouter();

    const [files, setFiles] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const swipeableRefs = useRef({});

    const fetchFiles = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/api/files/');
            setFiles(response.data);
            await refreshUser(); // Refresh user to get latest storage usage
        } catch (error) {
            Alert.alert(t('errors.generic', { message: '' }), translateApiError(error));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, []);

    const handleSelectFiles = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                multiple: true,
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setSelectedFiles(prev => [...prev, ...result.assets]);
            }
        } catch (error) {
            Alert.alert(t('errors.generic', { message: 'File selection failed.' }));
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;
        setIsUploading(true);

        const formData = new FormData();
        selectedFiles.forEach(file => {
            const fileData = {
                uri: file.uri,
                name: file.name,
                type: file.mimeType,
            };
            formData.append('files', fileData as any);
        });

        try {
            await api.post('/api/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSelectedFiles([]);
            await fetchFiles();
            Alert.alert(t('security_page.biometrics_success_title'), t('upload_page.success_upload', { count: selectedFiles.length }));
        } catch (error) {
            Alert.alert(t('errors.generic', { message: '' }), translateApiError(error));
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = (file) => {
        Alert.alert(
            t('upload_page.confirm_delete'),
            file.original_filename,
            [
                { text: t('settings_page.btn_cancel'), style: 'cancel', onPress: () => swipeableRefs.current[file.id]?.close() },
                {
                    text: t('settings_page.btn_confirm'), style: 'destructive', onPress: async () => {
                        try {
                            await api.delete(`/api/files/${file.id}`);
                            await fetchFiles();
                        } catch (error) {
                            Alert.alert('Error', translateApiError(error));
                        }
                    }
                }
            ]
        )
    };

    const handleDownload = async (file) => {
        const localUri = FileSystem.documentDirectory + file.original_filename;
        try {
            // Lấy token từ header mặc định của axios instance
            const token = api.defaults.headers.common['Authorization'];
            const { uri } = await FileSystem.downloadAsync(
                `${api.defaults.baseURL}/api/files/download/${file.id}`,
                localUri,
                { headers: { Authorization: token } }
            );

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert("Sharing not available on this device.");
            }
        } catch (error) {
            Alert.alert(t('errors.generic', { message: '' }), translateApiError(error));
        }
    };

    const renderRightActions = (item) => (
        <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>{t('contacts_page.action_delete')}</Text>
        </TouchableOpacity>
    );

    const renderFileItem = ({ item }) => (
        <Swipeable
            ref={ref => (swipeableRefs.current[item.id] = ref)}
            renderRightActions={() => renderRightActions(item)}
            overshootRight={false}
        >
            <TouchableOpacity style={styles.itemContainer} onPress={() => handleDownload(item)}>
                <Ionicons name="document-text-outline" size={24} color={themeColors.tint} />
                <View style={styles.itemTextContainer}>
                    <Text style={styles.itemLabel} numberOfLines={1}>{item.original_filename}</Text>
                    <Text style={styles.itemDescription}>
                        {formatBytes(item.filesize_bytes)}・{new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={themeColors.icon} />
            </TouchableOpacity>
        </Swipeable>
    );
    
    const renderSelectedFileItem = ({ item, index }) => (
        <View style={styles.selectedItemContainer}>
            <Ionicons name="document-attach-outline" size={20} color={themeColors.text} />
            <View style={styles.itemTextContainer}>
                 <Text style={styles.itemLabel} numberOfLines={1}>{item.name}</Text>
                 <Text style={styles.itemDescription}>{formatBytes(item.size)}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}>
                <Ionicons name="close-circle" size={22} color={themeColors.icon} />
            </TouchableOpacity>
        </View>
    );

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: themeColors.background },
        header: { padding: 15, backgroundColor: themeColors.inputBackground, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder },
        usageText: { textAlign: 'center', color: themeColors.icon, marginBottom: 15 },
        actionsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
        actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, backgroundColor: themeColors.background, flex: 1, justifyContent: 'center', marginHorizontal: 5 },
        actionText: { color: themeColors.tint, marginLeft: 8, fontWeight: '500' },
        uploadButton: { backgroundColor: themeColors.tint },
        uploadButtonText: { color: '#fff' },
        listContainer: { flex: 1 },
        emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        emptyText: { color: themeColors.icon, fontSize: 16 },
        itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder, backgroundColor: themeColors.inputBackground },
        itemTextContainer: { flex: 1, marginLeft: 15 },
        itemLabel: { fontSize: 16, color: themeColors.text },
        itemDescription: { fontSize: 12, color: themeColors.icon, marginTop: 2 },
        deleteAction: { backgroundColor: '#dc3545', justifyContent: 'center', alignItems: 'center', width: 80, height: '100%' },
        actionButtonText: { color: '#fff', fontSize: 12, marginTop: 4 },
        selectedFilesContainer: { paddingHorizontal: 15, paddingTop: 10 },
        selectedItemContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: themeColors.background, borderRadius: 8, marginBottom: 8 },
    });

    // Bọc toàn bộ return trong GestureHandlerRootView
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.usageText}>
                        {t('upload_page.usage_intro')} <Text style={{ fontWeight: 'bold' }}>{formatBytes(user?.uploaded_storage_bytes || 0)} / {user?.storage_limit_gb || 1} GB</Text>
                    </Text>
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity style={styles.actionButton} onPress={handleSelectFiles}>
                            <Ionicons name="add-circle-outline" size={22} color={themeColors.tint} />
                            <Text style={styles.actionText}>{t('upload_page.select_files_label_simple')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.uploadButton]} onPress={handleUpload} disabled={isUploading || selectedFiles.length === 0}>
                            {isUploading ? <ActivityIndicator color="#fff" /> : <>
                                <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
                                <Text style={[styles.actionText, styles.uploadButtonText]}>{t('upload_page.btn_upload')}</Text>
                            </>}
                        </TouchableOpacity>
                    </View>
                </View>

                {selectedFiles.length > 0 && (
                    <View style={styles.selectedFilesContainer}>
                        <FlatList
                            data={selectedFiles}
                            renderItem={renderSelectedFileItem}
                            keyExtractor={(item) => item.uri}
                        />
                    </View>
                )}

                {isLoading ? (
                    <ActivityIndicator style={{ marginTop: 20 }} size="large" color={themeColors.tint} />
                ) : (
                    <FlatList
                        data={files}
                        renderItem={renderFileItem}
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={() => <View style={styles.emptyContainer}><Text style={styles.emptyText}>{t('upload_page.file_list_empty')}</Text></View>}
                        onRefresh={fetchFiles}
                        refreshing={isLoading}
                    />
                )}
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}