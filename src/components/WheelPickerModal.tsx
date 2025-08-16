// src/components/WheelPickerModal.tsx

import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import WheelPicker from 'react-native-wheel-scrollview-picker';
import { Colors } from '../constants/Colors';
import { useTheme } from '../store/ThemeContext';
import { PickerOption } from './CustomPickerModal';

interface WheelPickerModalProps {
  isVisible: boolean;
  options: PickerOption[];
  title: string;
  initialValue: PickerOption | null;
  onClose: () => void;
  onSelect: (option: PickerOption) => void;
}

export default function WheelPickerModal({
  isVisible,
  options,
  title,
  initialValue,
  onClose,
  onSelect,
}: WheelPickerModalProps) {
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const styles = createStyles(themeColors);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pickerKey, setPickerKey] = useState(0);

  useEffect(() => {
    if (isVisible) {
      const initialIndex = options.findIndex(opt => opt.value === initialValue?.value);
      setSelectedIndex(initialIndex !== -1 ? initialIndex : 0);
      setPickerKey(prevKey => prevKey + 1);
    }
  }, [isVisible, initialValue, options]);

  const handleConfirm = () => {
    if (options.length > 0) {
      const selectedOption = options[selectedIndex];
      if (selectedOption) {
        onSelect(selectedOption);
      }
    }
    onClose();
  };

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      {/* Container chính chứa cả overlay và content */}
      <View style={styles.modalContainer}>
        {/* SIBLING 1: Lớp nền mờ (overlay) để đóng modal */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        {/* SIBLING 2: Lớp nội dung, nằm CẠNH HÀNG với overlay */}
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.headerButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeader}>{title}</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.headerButtonConfirm}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerWrapper}>
            {isVisible && options.length > 0 ? (
              <WheelPicker
                key={pickerKey}
                dataSource={options.map(opt => opt.label)}
                selectedIndex={selectedIndex}
                onValueChange={(data, index) => setSelectedIndex(index)}
                wrapperHeight={220}
                wrapperBackground={themeColors.card}
                itemHeight={50}
                highlightColor={themeColors.inputBorder}
                highlightBorderWidth={1}
                itemTextStyle={styles.pickerItem}
                activeItemTextStyle={styles.selectedPickerItem}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (themeColors: any) =>
  StyleSheet.create({
    // Cấu trúc style mới để hỗ trợ kiến trúc Siblings
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      backgroundColor: themeColors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.inputBorder,
    },
    modalHeader: {
      fontSize: 17,
      fontWeight: '600',
      color: themeColors.text,
    },
    headerButton: {
      fontSize: 16,
      color: themeColors.tint,
    },
    headerButtonConfirm: {
      fontSize: 16,
      color: themeColors.tint,
      fontWeight: 'bold',
    },
    pickerWrapper: {
      width: '100%',
      height: 220,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: themeColors.card,
    },
    pickerItem: {
      color: themeColors.text,
      fontSize: 22,
    },
    selectedPickerItem: {
      color: themeColors.tint,
      fontSize: 28,
    },
  });