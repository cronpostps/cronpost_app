// src/components/SafeDateTimePicker.tsx

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React from 'react';
import { Platform } from 'react-native';

interface SafeDateTimePickerProps {
  isVisible: boolean;
  value: Date;
  mode: 'date' | 'time' | 'datetime';
  timeZoneName?: string; // IANA Time Zone Name (e.g., "Asia/Ho_Chi_Minh")
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
    // Luôn đóng picker sau khi người dùng tương tác trên Android
    if (Platform.OS === 'android') {
      onClose();
    }

    // Chỉ xử lý khi người dùng bấm "OK" hoặc chọn một ngày/giờ
    if (event.type === 'set' && selectedDate) {
      // Ưu tiên đọc timestamp gốc từ nativeEvent - đây là nguồn dữ liệu đáng tin cậy nhất
      const timestamp = event.nativeEvent?.timestamp;

      if (timestamp) {
        // Tạo đối tượng Date mới, sạch sẽ và đáng tin cậy từ timestamp
        onSelect(new Date(timestamp));
      } else {
        // Phương án dự phòng cho các nền tảng cũ không có timestamp
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
      timeZoneName={timeZoneName} // Sử dụng múi giờ được truyền vào
    />
  );
}