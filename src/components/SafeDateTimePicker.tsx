// src/components/SafeDateTimePicker.tsx
// version 1.1.0

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Button, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useTheme } from '../store/ThemeContext';

interface SafeDateTimePickerProps {
  isVisible: boolean;
  value: Date;
  mode: 'date' | 'time' | 'datetime';
  timeZoneName?: string;
  onClose: () => void;
  onSelect: (date: Date) => void;
}

export default function SafeDateTimePicker({
  isVisible,
  value,
  mode,
  timeZoneName,
  onClose,
  onSelect,
}: SafeDateTimePickerProps) {
  const { theme } = useTheme();
  const [internalDate, setInternalDate] = useState(value);
  const themeColors = Colors[theme];

  const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
      const currentDate = selectedDate || internalDate;
      setInternalDate(currentDate);
      if (Platform.OS === 'android' && event.type === 'set') {
          onSelect(currentDate);
          onClose();
      }
  };

  const handleConfirm = () => {
    onSelect(internalDate);
    onClose();
  };

  if (!isVisible) {
    return null;
  }

  if (Platform.OS === 'ios' && mode === 'date') {
    const styles = createStyles(themeColors);
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={isVisible}
        onRequestClose={onClose}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select a Date</Text>
            <DateTimePicker
              value={internalDate} 
              mode="date"
              display="inline"
              onChange={onChange}
              timeZoneName={timeZoneName}
              textColor={themeColors.text}
            />
            <Button title="Done" onPress={handleConfirm} color={themeColors.tint} />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  return (
    <DateTimePicker
      value={value}
      mode={mode}
      display="default"
      onChange={onChange}
      timeZoneName={timeZoneName}
    />
  );
}

const createStyles = (themeColors: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: themeColors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: themeColors.text,
  },
});