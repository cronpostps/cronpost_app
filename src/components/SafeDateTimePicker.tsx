// src/components/SafeDateTimePicker.tsx

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React from 'react';
import { Platform } from 'react-native';

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
  
  const onChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      onClose();
    }
    if (event.type === 'set' && selectedDate) {
      const timestamp = event.nativeEvent?.timestamp;

      if (timestamp) {
        onSelect(new Date(timestamp));
      } else {
        onSelect(selectedDate);
      }
    }
  };

  if (!isVisible) {
    return null;
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