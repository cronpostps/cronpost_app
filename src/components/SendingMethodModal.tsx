// src/components/SendingMethodModal.tsx
// Version 1.0.2

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { useTheme } from '../store/ThemeContext';

export interface MethodOption {
  key: 'cronpost_email' | 'in_app_messaging' | 'user_email';
  label: string;
  email?: string;
}

interface SendingMethodModalProps {
  isVisible: boolean;
  methods: MethodOption[];
  onClose: () => void;
  onSelect: (method: 'cronpost_email' | 'in_app_messaging' | 'user_email') => void;
}

const SendingMethodModal = ({
  isVisible,
  methods,
  onClose,
  onSelect,
}: SendingMethodModalProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const themeColors = Colors[theme];

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    content: {
      width: '90%',
      maxWidth: 400,
      backgroundColor: themeColors.card,
      borderRadius: 10,
      padding: 15,
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: themeColors.inputBorder,
      paddingBottom: 10,
    },
    header: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themeColors.text,
    },
    modalItem: {
      paddingVertical: 15,
    },
    modalItemText: {
      color: themeColors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    smtpEmailText: {
      color: themeColors.icon,
      fontSize: 14,
      textTransform: 'lowercase',
    },
  });

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerContainer}>
            <Text style={styles.header}>{t('scm_page.th_method')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>

          {methods.map((method) => (
            <TouchableOpacity
              key={method.key}
              style={styles.modalItem}
              onPress={() => onSelect(method.key)}
            >
              {method.key === 'user_email' ? (
                <View>
                  <Text style={styles.modalItemText}>SMTP</Text>
                  <Text style={styles.smtpEmailText}>({method.email})</Text>
                </View>
              ) : (
                <Text style={styles.modalItemText}>{method.label}</Text>
              )}
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default SendingMethodModal;