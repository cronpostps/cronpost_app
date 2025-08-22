// src/components/LanguagePicker.tsx
// Version: 1.1.0

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { LanguageCode, SUPPORTED_LANGUAGES } from '../constants/languages';
import { useTheme } from '../store/ThemeContext';

interface LanguagePickerProps {
  isVisible: boolean;
  onClose: () => void;
}

const LanguagePicker: React.FC<LanguagePickerProps> = ({ isVisible, onClose }) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];

  const onSelectLanguage = (langCode: LanguageCode) => {
    i18n.changeLanguage(langCode);
    onClose();
  };

  const renderItem = ({ item }: { item: (typeof SUPPORTED_LANGUAGES)[0] }) => (
    <TouchableOpacity
      style={styles.languageItem}
      onPress={() => onSelectLanguage(item.code)}>
      <Text style={styles.languageName}>{item.name}</Text>
      {i18n.language === item.code && (
        <Ionicons name="checkmark" size={24} color={themeColors.tint} />
      )}
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: themeColors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 10,
      paddingTop: 10,
      maxHeight: Dimensions.get('window').height * 0.4,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 10,
      paddingHorizontal: 10,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themeColors.text,
    },
    listContainer: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: themeColors.inputBorder,
    },
    languageItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 10,
    },
    languageName: {
      fontSize: 16,
      color: themeColors.text,
      flex: 1,
    },
  });

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPressOut={onClose}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('language_picker.title')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={themeColors.icon} />
            </TouchableOpacity>
          </View>
          <FlatList
            style={styles.listContainer}
            data={SUPPORTED_LANGUAGES}
            renderItem={renderItem}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
};

export default LanguagePicker;