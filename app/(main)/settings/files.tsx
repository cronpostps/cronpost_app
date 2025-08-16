import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import RNBlobUtil from 'react-native-blob-util';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import api from '../../../src/api/api';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

interface FileItem {
  id: string;
  original_filename: string;
  filesize_bytes: number;
  created_at: string;
}
interface UploadTask {
    id: string;
    progress: number;
    fileName: string;
    state: 'uploading' | 'error' | 'completed';
    task: any; // Giữ task của RNBlobUtil để có thể hủy
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const ProgressBar = ({ progress, themeColors }: { progress: number, themeColors: any }) => (
    <View style={{ height: 6, backgroundColor: themeColors.inputBorder, borderRadius: 3, marginTop: 5 }}>
        <View style={{ height: '100%', width: `${progress}%`, backgroundColor: themeColors.tint, borderRadius: 3 }} />
    </View>
);

export default function FileManagementScreen() {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { user, refreshUser } = useAuth();
    const themeColors = Colors[theme];

    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
    const [uploads, setUploads] = useState<UploadTask[]>([]);
    
    const clientSideTotalBytes = React.useMemo(() => files.reduce((total, file) => total + file.filesize_bytes, 0), [files]);    
    const isInitialLoad = useRef(true);
    const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
    const stableRefreshUser = useRef(refreshUser);

    useEffect(() => { stableRefreshUser.current = refreshUser; }, [refreshUser]);

    const fetchFiles = useCallback(async () => {
        try {
            const response = await api.get('/api/files/');
            setFiles(response.data);
        } catch (error) {
            Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
        } finally {
            setIsLoading(false);
        }
    }, [t]);
    
    useFocusEffect(useCallback(() => {
        if (isInitialLoad.current) {
            setIsLoading(true);
            isInitialLoad.current = false;
        }
        fetchFiles();
        stableRefreshUser.current();
    }, [fetchFiles]));

    const handlePickAndUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
            if (result.canceled || !result.assets) return;

            // THAY ĐỔI 1: Sử dụng đúng key là 'accessToken'
            const token = await SecureStore.getItemAsync('accessToken');
            
            if (!token) {
                Toast.show({ type: 'error', text1: t('errors.title_error'), text2: 'Authentication token not found.' });
                return;
            }

            for (const asset of result.assets) {
                const uploadId = `${Date.now()}-${asset.name}`;
                
                const uploadTask = RNBlobUtil.fetch('POST', `${api.defaults.baseURL}/api/files/upload`, {
                    // THAY ĐỔI 2: Thêm tiền tố 'Bearer ' vào trước token
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                }, [
                    {
                        name: 'files',
                        filename: asset.name,
                        type: asset.mimeType || 'application/octet-stream',
                        data: RNBlobUtil.wrap(asset.uri)
                    }
                ]);

                setUploads(prev => [...prev, { id: uploadId, progress: 0, fileName: asset.name, state: 'uploading', task: uploadTask }]);

                uploadTask.uploadProgress((written, total) => {
                    const progress = Math.floor((written / total) * 100);
                    setUploads(prev => prev.map(up => up.id === uploadId ? { ...up, progress } : up));
                });
                
                uploadTask.then((resp) => {
                    const info = resp.info();
                    if (info.status >= 200 && info.status < 300) {
                        setUploads(prev => prev.map(up => up.id === uploadId ? { ...up, state: 'completed', progress: 100 } : up));
                        setTimeout(() => {
                            setUploads(prev => prev.filter(up => up.id !== uploadId));
                            fetchFiles();
                            stableRefreshUser.current();
                        }, 1500);
                    } else {
                        throw new Error(`Server responded with ${info.status}: ${resp.data}`);
                    }
                }).catch((err) => {
                    if (err.toString().includes('cancelled')) {
                        setUploads(prev => prev.filter(up => up.id !== uploadId));
                        return;
                    }
                    setUploads(prev => prev.map(up => up.id === uploadId ? { ...up, state: 'error' } : up));
                    Toast.show({ type: 'error', text1: t('upload_page.error_upload_failed'), text2: err.message });
                });
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
        }
    };
    
    const handleDelete = (file: FileItem) => {
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
                            await stableRefreshUser.current();
                        } catch (error) {
                            Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
                        }
                    }
                }
            ]
        )
    };
    
    const handleDownload = async (file: FileItem) => {
        const localUri = FileSystem.documentDirectory + file.original_filename;
        try {
            const token = api.defaults.headers.common['Authorization'];
            const { uri } = await FileSystem.downloadAsync(
                `${api.defaults.baseURL}/api/files/download/${file.id}`,
                localUri,
                { headers: { Authorization: token as string } }
            );
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri);
            } else {
                Toast.show({ type: 'info', text1: "Sharing not available on this device." });
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
        }
    };

    const enterSelectMode = (initialFile: FileItem) => {
        if(isSelectMode) return;
        setIsSelectMode(true);
        setSelectedFileIds(new Set([initialFile.id]));
    };

    const cancelSelectMode = () => {
        setIsSelectMode(false);
        setSelectedFileIds(new Set());
    };

    const toggleSelectFile = (fileId: string) => {
        const newSelection = new Set(selectedFileIds);
        if (newSelection.has(fileId)) {
            newSelection.delete(fileId);
        } else {
            newSelection.add(fileId);
        }
        setSelectedFileIds(newSelection);
    };

    const handleDeleteSelected = () => {
        Alert.alert(
            t('upload_page.confirm_delete'),
            t('iam_page.confirm_delete_multiple', { count: selectedFileIds.size }),
            [
                { text: t('settings_page.btn_cancel'), style: 'cancel' },
                {
                    text: t('settings_page.btn_confirm'), style: 'destructive', onPress: async () => {
                        try {
                            const idsToDelete = Array.from(selectedFileIds);
                            await Promise.all(idsToDelete.map(id => api.delete(`/api/files/${id}`)));
                            await fetchFiles();
                            await stableRefreshUser.current();
                            cancelSelectMode();
                        } catch (error) {
                            Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
                        }
                    }
                }
            ]
        );
    };

    const renderFileItem = ({ item }: { item: FileItem }) => {
        const isSelected = selectedFileIds.has(item.id);
        return (
            <Swipeable
                ref={ref => { swipeableRefs.current[item.id] = ref; }}
                renderRightActions={() => (
                    <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                )}
                overshootRight={false}
                enabled={!isSelectMode}
            >
                <TouchableOpacity
                    style={styles.itemContainer}
                    onPress={() => isSelectMode ? toggleSelectFile(item.id) : handleDownload(item)}
                    onLongPress={() => enterSelectMode(item)}
                    delayLongPress={200}
                >
                    {isSelectMode && (
                        <Ionicons 
                            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                            size={24} 
                            color={isSelected ? themeColors.tint : themeColors.icon}
                            style={styles.checkbox}
                        />
                    )}
                    <Ionicons name="document-text-outline" size={24} color={themeColors.tint} />
                    <View style={styles.itemTextContainer}>
                        <Text style={styles.itemLabel} numberOfLines={1}>{item.original_filename}</Text>
                        <Text style={styles.itemDescription}>
                            {formatBytes(item.filesize_bytes)}・{new Date(item.created_at).toLocaleDateString()}
                        </Text>
                    </View>
                    {!isSelectMode && <Ionicons name="chevron-forward" size={20} color={themeColors.icon} />}
                </TouchableOpacity>
            </Swipeable>
        );
    };

    const renderUploadItem = ({ item }: { item: UploadTask }) => {
        const getStatusColor = () => {
            if (item.state === 'error') return 'red';
            if (item.state === 'completed') return '#28a745';
            return themeColors.tint;
        };
        return (
            <View style={styles.uploadItemContainer}>
                <Ionicons name="document-attach-outline" size={24} color={getStatusColor()} />
                <View style={styles.itemTextContainer}>
                    <Text style={styles.itemLabel} numberOfLines={1}>{item.fileName}</Text>
                    <ProgressBar progress={item.progress} themeColors={themeColors} />
                </View>
                {item.state === 'uploading' && (
                    <TouchableOpacity onPress={() => item.task?.cancel()}>
                        <Ionicons name="close-circle" size={24} color={themeColors.icon} />
                    </TouchableOpacity>
                )}
                 {item.state === 'completed' && <Ionicons name="checkmark-circle" size={24} color={getStatusColor()} />}
                 {item.state === 'error' && <Ionicons name="alert-circle" size={24} color={getStatusColor()} />}
            </View>
        );
    };

    const NormalHeader = () => {
        const hasOngoingUploads = uploads.some(up => up.state === 'uploading');
        
        return (
            <View style={[styles.header, styles.headerNormal]}>
                <View style={styles.headerLeft}>
                    <Ionicons name="folder-open-outline" size={22} color={themeColors.icon} />
                    <Text style={styles.usageText}>
                        {formatBytes(clientSideTotalBytes)} / {user?.storage_limit_gb || 0} GB
                    </Text>
                </View>
                <TouchableOpacity onPress={handlePickAndUpload} disabled={hasOngoingUploads}>
                    {hasOngoingUploads
                        ? <ActivityIndicator color={themeColors.tint} /> 
                        : <Ionicons name="cloud-upload-outline" size={28} color={themeColors.tint} />
                    }
                </TouchableOpacity>
            </View>
        );
    };
    
    const SelectionHeader = () => (
        <View style={[styles.header, styles.headerSelection]}>
            <TouchableOpacity onPress={cancelSelectMode}>
                <Ionicons name="close" size={28} color={themeColors.tint} />
            </TouchableOpacity>
            <Text style={styles.selectionCountText}>
                {t('files_page.selection_header_title', { count: selectedFileIds.size })}
            </Text>
            <View style={{width: 28}} />
        </View>
    );
    
    const SelectionFooter = () => (
        <View style={styles.footer}>
            <TouchableOpacity 
                style={[styles.footerButton, selectedFileIds.size === 0 && styles.footerButtonDisabled]} 
                onPress={handleDeleteSelected}
                disabled={selectedFileIds.size === 0}
            >
                 <Ionicons name="trash-outline" size={22} color="#fff" />
                 <Text style={styles.footerButtonText}>{t('iam_page.btn_delete_selected')}</Text>
            </TouchableOpacity>
        </View>
    );

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: themeColors.background },
        header: { padding: 15, backgroundColor: themeColors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder, alignItems: 'center' },
        headerNormal: { flexDirection: 'row', justifyContent: 'space-between' },
        headerSelection: { flexDirection: 'row', justifyContent: 'space-between' },
        headerLeft: { flexDirection: 'row', alignItems: 'center' },
        usageText: { color: themeColors.icon, marginLeft: 8, fontWeight: '500' },
        selectionCountText: { color: themeColors.text, fontSize: 18, fontWeight: 'bold' },
        emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
        emptyText: { color: themeColors.icon, fontSize: 16 },
        itemContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.inputBorder, backgroundColor: themeColors.card },
        itemTextContainer: { flex: 1, marginLeft: 15 },
        itemLabel: { fontSize: 16, color: themeColors.text },
        itemDescription: { fontSize: 12, color: themeColors.icon, marginTop: 2 },
        checkbox: { marginRight: 15 },
        deleteAction: { backgroundColor: '#dc3545', justifyContent: 'center', alignItems: 'center', width: 80, height: '100%' },
        footer: { padding: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: themeColors.inputBorder, backgroundColor: themeColors.card },
        footerButton: { flexDirection: 'row', backgroundColor: '#dc3545', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 8 },
        footerButtonDisabled: { backgroundColor: themeColors.icon },
        footerButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
        uploadingContainer: {
            paddingHorizontal: 15,
            paddingTop: 10,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: themeColors.inputBorder,
            backgroundColor: themeColors.card,
        },
        uploadItemContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
        },
    });

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                {isSelectMode ? <SelectionHeader /> : <NormalHeader />}
                {uploads.length > 0 && (
                    <View style={styles.uploadingContainer}>
                        <FlatList
                            data={uploads}
                            renderItem={renderUploadItem}
                            keyExtractor={(item) => item.id}
                        />
                    </View>
                )}
                {isLoading ? (
                    <ActivityIndicator style={{ flex: 1 }} size="large" color={themeColors.tint} />
                ) : (
                    <FlatList
                        data={files}
                        renderItem={renderFileItem}
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={() => <View style={styles.emptyContainer}><Text style={styles.emptyText}>{t('upload_page.file_list_empty')}</Text></View>}
                    />
                )}
                {isSelectMode && <SelectionFooter />}
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}