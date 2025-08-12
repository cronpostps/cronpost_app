// src/components/CustomPickerModal.tsx

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useTheme } from '../store/ThemeContext';

export interface PickerOption {
  label: string;
  value: any;
}

interface CustomPickerModalProps {
  isVisible: boolean;
  options: PickerOption[];
  title: string;
  onClose: () => void;
  onSelect: (option: PickerOption) => void;
}

export default function CustomPickerModal({
  isVisible,
  options,
  title,
  onClose,
  onSelect,
}: CustomPickerModalProps) {
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const styles = createStyles(themeColors);

  const handleSelect = (option: PickerOption) => {
    onSelect(option);
    onClose();
  };

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.modalHeader}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => handleSelect(item)}>
                <Text style={styles.modalItemName}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const createStyles = (themeColors: any) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
      width: '85%',
      maxHeight: '60%',
      backgroundColor: themeColors.card,
      borderRadius: 10,
      padding: 15,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: themeColors.inputBorder,
      paddingBottom: 10,
      marginBottom: 5,
    },
    modalHeader: {
      fontSize: 18,
      fontWeight: 'bold',
      color: themeColors.text,
    },
    modalItem: {
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.inputBorder,
    },
    modalItemName: {
      fontSize: 16,
      color: themeColors.text,
    },
    modalCloseButton: {
      padding: 5,
    },
  });