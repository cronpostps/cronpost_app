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
  initialValue?: PickerOption | null;
  onClose: () => void;
  onSelect: (option: PickerOption) => void;
  mode?: 'single' | 'time';
  initialTimeValue?: Date;
  onTimeSelect?: (date: Date) => void;
}

export default function WheelPickerModal({
  isVisible,
  options,
  title,
  initialValue,
  onClose,
  onSelect,
  mode = 'single',
  initialTimeValue,
  onTimeSelect,
}: WheelPickerModalProps) {
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const styles = createStyles(themeColors);

  const [selectedHourIndex, setSelectedHourIndex] = useState(0);
  const [selectedMinuteIndex, setSelectedMinuteIndex] = useState(0);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pickerKey, setPickerKey] = useState(0);

  useEffect(() => {
    if (isVisible) {
      if (mode === 'time') {
        const initialDate = initialTimeValue || new Date();
        setSelectedHourIndex(initialDate.getHours());
        setSelectedMinuteIndex(initialDate.getMinutes());
      } else {
        const initialIndex = options.findIndex(opt => opt.value === initialValue?.value);
        setSelectedIndex(initialIndex !== -1 ? initialIndex : 0);
      }
      // Tái render picker để đảm bảo giá trị ban đầu được áp dụng
      setPickerKey(prevKey => prevKey + 1);
    }
  }, [isVisible, initialValue, options, mode, initialTimeValue]);

  const handleConfirm = () => {
    if (mode === 'time') {
      const newDate = new Date(initialTimeValue || Date.now());
      newDate.setHours(selectedHourIndex, selectedMinuteIndex, 0, 0);
      onTimeSelect?.(newDate);
    } else {
      if (options.length > 0) {
        const selectedOption = options[selectedIndex];
        if (selectedOption) {
          onSelect(selectedOption);
        }
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
            {isVisible && mode === 'single' && options.length > 0 && (
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
            )}
            {isVisible && mode === 'time' && (
              <View style={styles.timePickerContainer}>
                <WheelPicker
                  key={`${pickerKey}-h`}
                  dataSource={hours}
                  selectedIndex={selectedHourIndex}
                  onValueChange={(data, index) => setSelectedHourIndex(index)}
                  wrapperHeight={220}
                  wrapperBackground={themeColors.card}
                  itemHeight={50}
                  highlightColor={themeColors.inputBorder}
                  highlightBorderWidth={1}
                  itemTextStyle={styles.pickerItem}
                  activeItemTextStyle={styles.selectedPickerItem}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <WheelPicker
                  key={`${pickerKey}-m`}
                  dataSource={minutes}
                  selectedIndex={selectedMinuteIndex}
                  onValueChange={(data, index) => setSelectedMinuteIndex(index)}
                  wrapperHeight={220}
                  wrapperBackground={themeColors.card}
                  itemHeight={50}
                  highlightColor={themeColors.inputBorder}
                  highlightBorderWidth={1}
                  itemTextStyle={styles.pickerItem}
                  activeItemTextStyle={styles.selectedPickerItem}
                />
              </View>
            )}
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
    timePickerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeSeparator: {
        fontSize: 28,
        color: themeColors.tint,
        marginHorizontal: 10,
    },
  });