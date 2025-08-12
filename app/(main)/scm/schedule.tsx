// app/(main)/scm/schedule.tsx
// version 1.1.0

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../../../src/api/api';
import CustomPickerModal, { PickerOption } from '../../../src/components/CustomPickerModal';
import { Colors } from '../../../src/constants/Colors';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';

type ScheduleData = {
  schedule_type?: 'loop' | 'unloop';
  repeat_number?: number;
  loop_type?: string;
  loop_interval_minutes?: number;
  loop_interval_days?: number;
  loop_day_of_week?: string;
  loop_date_of_month?: number;
  loop_date_of_year?: string;
  loop_is_leap_month?: boolean;
  loop_sending_time?: string;
  unloop_send_at?: string;
};

export default function ScmScheduleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();
  const themeColors = Colors[theme];
  const styles = createStyles(themeColors);

  const params = useLocalSearchParams<{
    recipients: string; subject: string; content: string; attachments: string;
    scmId?: string;
    sendingMethod: 'in_app_messaging' | 'cronpost_email' | 'user_email';
    fromComposer?: 'true';
  }>();

  const messageData = {
    recipients: JSON.parse(params.recipients || '[]'),
    subject: params.subject,
    content: params.content,
    attachments: JSON.parse(params.attachments || '[]'),
  };
  const contentSummary = params.content?.replace(/<[^>]*>?/gm, '');

  const [isLoading, setIsLoading] = useState(!!params.scmId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scheduleType, setScheduleType] = useState<'loop' | 'unloop'>('loop');
  
  const [unloopDate, setUnloopDate] = useState(new Date());
  const [showUnloopDatePicker, setShowUnloopDatePicker] = useState(false);
  const [showUnloopTimePicker, setShowUnloopTimePicker] = useState(false);

  const [loopType, setLoopType] = useState<PickerOption>({ value: 'minutes', label: t('scm_page.schedule_form.option_by_minutes') });
  const [loopIntervalMinutes, setLoopIntervalMinutes] = useState('30');
  const [loopIntervalDays, setLoopIntervalDays] = useState('1');
  const [loopDayOfWeek, setLoopDayOfWeek] = useState<PickerOption>({ value: 'Mon', label: t('ucm_page.day_mon') });
  const [loopDateOfMonth, setLoopDateOfMonth] = useState('1');
  const [loopLunarMonth, setLoopLunarMonth] = useState('1');
  const [loopLunarDay, setLoopLunarDay] = useState('1');
  const [loopIsLeapMonth, setLoopIsLeapMonth] = useState(false);
  const [loopSendingTime, setLoopSendingTime] = useState(new Date());
  const [showLoopTimePicker, setShowLoopTimePicker] = useState(false);
  const [repeatNumber, setRepeatNumber] = useState('1');

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerOptions, setPickerOptions] = useState<PickerOption[]>([]);
  const [pickerTitle, setPickerTitle] = useState('');
  const [currentPicker, setCurrentPicker] = useState<string | null>(null);

  const loopTypeOptions = useMemo(() => [
    { value: 'minutes', label: t('scm_page.schedule_form.option_by_minutes') },
    { value: 'days', label: t('scm_page.schedule_form.option_by_days') },
    { value: 'day_of_week', label: t('scm_page.schedule_form.option_day_of_week') },
    { value: 'date_of_month', label: t('scm_page.schedule_form.option_date_of_month') },
    { value: 'date_of_lunar_year', label: t('scm_page.schedule_form.option_date_of_lunar_year') },
  ], [t]);

  const dayOfWeekOptions = useMemo(() => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => ({
    value: day.charAt(0).toUpperCase() + day.slice(1),
    label: t(`ucm_page.day_${day}`)
  })), [t]);
  
  useEffect(() => {
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    setLoopSendingTime(defaultTime);
    setUnloopDate(defaultTime);
  }, []);

  useEffect(() => {
    const fetchScheduleData = async () => {
      if (!params.scmId) return;
      try {
        const response = await api.get(`/api/scm/${params.scmId}`);
        const scmData: ScheduleData = response.data;

        if (!scmData.schedule_type) {
            setIsLoading(false);
            return;
        }

        setScheduleType(scmData.schedule_type);
        setRepeatNumber(String(scmData.repeat_number || 1));

        if (scmData.schedule_type === 'unloop' && scmData.unloop_send_at) {
          setUnloopDate(new Date(scmData.unloop_send_at));
        }
        
        if (scmData.schedule_type === 'loop') {
          const fetchedLoopType = loopTypeOptions.find(opt => opt.value === scmData.loop_type) || loopTypeOptions[0];
          setLoopType(fetchedLoopType);
          setLoopIntervalMinutes(String(scmData.loop_interval_minutes || 30));
          setLoopIntervalDays(String(scmData.loop_interval_days || 1));
          setLoopDateOfMonth(String(scmData.loop_date_of_month || 1));
          
          if (scmData.loop_type === 'date_of_lunar_year' && scmData.loop_date_of_year) {
            const [month, day] = scmData.loop_date_of_year.split('-');
            setLoopLunarMonth(String(parseInt(month, 10)));
            setLoopLunarDay(String(parseInt(day, 10)));
          }
          
          setLoopIsLeapMonth(scmData.loop_is_leap_month || false);
          
          if (scmData.loop_day_of_week) {
            const fetchedDay = dayOfWeekOptions.find(d => d.value === scmData.loop_day_of_week) || dayOfWeekOptions[0];
            setLoopDayOfWeek(fetchedDay);
          }
          
          if (scmData.loop_sending_time) {
            const [hours, minutes] = scmData.loop_sending_time.split(':');
            const newTime = new Date();
            newTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            setLoopSendingTime(newTime);
          }
        }
      } catch (error) {
        Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchScheduleData();
  }, [params.scmId, router, t, loopTypeOptions, dayOfWeekOptions]);
  
  // const handleSubmit = async () => {
  //   setIsSubmitting(true);
  //   try {
  //     let schedulePayload: Partial<ScheduleData> = {
  //       schedule_type: scheduleType,
  //       repeat_number: parseInt(repeatNumber, 10) || 1,
  //     };

  //     if (scheduleType === 'unloop') {
  //       schedulePayload.unloop_send_at = unloopDate.toISOString();
  //     } else {
  //       schedulePayload.loop_type = loopType.value;
  //       if (loopType.value !== 'minutes') {
  //           schedulePayload.loop_sending_time = dayjs(loopSendingTime).format('HH:mm');
  //       }
  //       switch(loopType.value) {
  //           case 'minutes': schedulePayload.loop_interval_minutes = parseInt(loopIntervalMinutes, 10); break;
  //           case 'days': schedulePayload.loop_interval_days = parseInt(loopIntervalDays, 10); break;
  //           case 'day_of_week': schedulePayload.loop_day_of_week = loopDayOfWeek.value; break;
  //           case 'date_of_month': schedulePayload.loop_date_of_month = parseInt(loopDateOfMonth, 10); break;
  //           case 'date_of_lunar_year':
  //               schedulePayload.loop_date_of_year = `${String(loopLunarMonth).padStart(2, '0')}-${String(loopLunarDay).padStart(2, '0')}`;
  //               schedulePayload.loop_is_leap_month = loopIsLeapMonth;
  //               break;
  //       }
  //     }

  //     let apiPayload;
  //     const finalMessageData = {
  //       title: messageData.subject,
  //       content: messageData.content,
  //       receiver_addresses: messageData.recipients,
  //       attachment_file_ids: messageData.attachments.map((f: any) => f.id),
  //       sending_method: params.sendingMethod,
  //     };

  //     if (params.scmId) {
  //       apiPayload = {
  //         message: finalMessageData,
  //         schedule: schedulePayload,
  //       };
  //       await api.put(`/api/scm/${params.scmId}`, apiPayload);
  //     } else {
  //       apiPayload = {
  //         message: finalMessageData,
  //         schedule: schedulePayload,
  //         is_draft: false,
  //       };
  //       await api.post('/api/scm/', apiPayload);
  //     }

  //     Toast.show({
  //       type: 'success',
  //       text1: t('scm_page.schedule_success_title'),
  //       text2: t('scm_page.schedule_success_body')
  //     });
  //     router.replace('/scm');

  //   } catch (error) {
  //     Alert.alert(t('errors.title_error'), translateApiError(error));
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

// app/(main)/scm/schedule.tsx

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let schedulePayload: Partial<ScheduleData> = {
        schedule_type: scheduleType,
        repeat_number: parseInt(repeatNumber, 10) || 1,
      };

      if (scheduleType === 'unloop') {
        schedulePayload.unloop_send_at = unloopDate.toISOString();
      } else {
        schedulePayload.loop_type = loopType.value;
        if (loopType.value !== 'minutes') {
            schedulePayload.loop_sending_time = dayjs(loopSendingTime).format('HH:mm');
        }
        switch(loopType.value) {
            case 'minutes': schedulePayload.loop_interval_minutes = parseInt(loopIntervalMinutes, 10); break;
            case 'days': schedulePayload.loop_interval_days = parseInt(loopIntervalDays, 10); break;
            case 'day_of_week': schedulePayload.loop_day_of_week = loopDayOfWeek.value; break;
            case 'date_of_month': schedulePayload.loop_date_of_month = parseInt(loopDateOfMonth, 10); break;
            case 'date_of_lunar_year':
                schedulePayload.loop_date_of_year = `${String(loopLunarMonth).padStart(2, '0')}-${String(loopLunarDay).padStart(2, '0')}`;
                schedulePayload.loop_is_leap_month = loopIsLeapMonth;
                break;
        }
      }

      let apiPayload;
      const finalMessageData = {
        title: messageData.subject,
        content: messageData.content,
        receiver_addresses: messageData.recipients,
        attachment_file_ids: messageData.attachments.map((f: any) => f.id),
        sending_method: params.sendingMethod,
      };

      if (params.scmId) {
        // FIX: Loại bỏ sending_method khỏi message payload khi cập nhật
        const { sending_method, ...updateMessagePayload } = finalMessageData;
        apiPayload = {
          message: updateMessagePayload,
          schedule: schedulePayload,
        };
        await api.put(`/api/scm/${params.scmId}`, apiPayload);
      } else {
        apiPayload = {
          message: finalMessageData,
          schedule: schedulePayload,
          is_draft: false,
        };
        await api.post('/api/scm/', apiPayload);
      }

      Toast.show({
        type: 'success',
        text1: t('scm_page.schedule_success_title'),
        text2: t('scm_page.schedule_success_body')
      });
      router.replace('/(main)/scm');

    } catch (error) {
      Alert.alert(t('errors.title_error'), translateApiError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavigateToComposer = () => {
    if (params.fromComposer) {
      // Nếu đến từ màn hình soạn thảo, chỉ cần quay lại
      router.back();
    } else {
      // Nếu đến từ quy trình "Reschedule", thay thế màn hình hiện tại bằng màn hình compose
      router.replace({
        pathname: '/(main)/scm/compose',
        params: { scmId: params.scmId },
      });
    }
  };
  
  const getSendingMethodText = () => {
      switch (params.sendingMethod) {
          case 'in_app_messaging': return t('scm_page.method_iam');
          case 'cronpost_email': return t('scm_page.method_cp_email');
          case 'user_email': return t('scm_page.method_smtp');
          default: return 'SCM';
      }
  }

  const onUnloopDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowUnloopDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newDate = new Date(unloopDate);
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setUnloopDate(newDate);
    }
  };

  const onUnloopTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowUnloopTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDate = new Date(unloopDate);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setUnloopDate(newDate);
    }
  };
  
  const onLoopTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowLoopTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setLoopSendingTime(selectedTime);
    }
  };

  const openPicker = (pickerName: string, title: string, options: PickerOption[]) => {
    setCurrentPicker(pickerName);
    setPickerTitle(title);
    setPickerOptions(options);
    setPickerVisible(true);
  };

  const onPickerSelect = (option: PickerOption) => {
    switch (currentPicker) {
      case 'loopType': setLoopType(option); break;
      case 'loopDayOfWeek': setLoopDayOfWeek(option); break;
    }
  };
  
  const renderLoopInputs = () => {
    return (
      <View>
        <Text style={styles.formLabel}>{t('scm_page.schedule_form.label_loop_type')}</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('loopType', t('scm_page.schedule_form.label_loop_type'), loopTypeOptions)}>
          <Text style={styles.pickerButtonText}>{loopType.label}</Text>
          <Ionicons name="chevron-down" size={20} color={themeColors.icon} />
        </TouchableOpacity>

        {loopType.value === 'minutes' && (
          <View>
            <Text style={styles.formLabel}>{t('scm_page.schedule_form.label_interval_minutes')}</Text>
            <TextInput style={styles.textInput} value={loopIntervalMinutes} onChangeText={setLoopIntervalMinutes} keyboardType="number-pad" />
          </View>
        )}
        {loopType.value === 'days' && (
          <View>
            <Text style={styles.formLabel}>{t('scm_page.schedule_form.label_interval_days')}</Text>
            <TextInput style={styles.textInput} value={loopIntervalDays} onChangeText={setLoopIntervalDays} keyboardType="number-pad" />
          </View>
        )}
        {loopType.value === 'day_of_week' && (
           <View>
            <Text style={styles.formLabel}>{t('scm_page.schedule_form.label_day')}</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('loopDayOfWeek', t('scm_page.schedule_form.label_day'), dayOfWeekOptions)}>
                <Text style={styles.pickerButtonText}>{loopDayOfWeek.label}</Text>
                <Ionicons name="chevron-down" size={20} color={themeColors.icon} />
            </TouchableOpacity>
           </View>
        )}
        {loopType.value === 'date_of_month' && (
            <View>
                <Text style={styles.formLabel}>{t('scm_page.schedule_form.label_date')}</Text>
                <TextInput style={styles.textInput} value={loopDateOfMonth} onChangeText={setLoopDateOfMonth} keyboardType="number-pad" maxLength={2} />
                {parseInt(loopDateOfMonth, 10) > 28 && <Text style={styles.warningText}>{t('warnings.date_of_month_skip')}</Text>}
            </View>
        )}
         {loopType.value === 'date_of_lunar_year' && (
          <View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>{t('scm_page.schedule_form.label_lunar_month')}</Text>
                <TextInput style={styles.textInput} value={loopLunarMonth} onChangeText={setLoopLunarMonth} keyboardType="number-pad" maxLength={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formLabel}>{t('scm_page.schedule_form.label_lunar_day')}</Text>
                <TextInput style={styles.textInput} value={loopLunarDay} onChangeText={setLoopLunarDay} keyboardType="number-pad" maxLength={2} />
              </View>
            </View>
            <View style={styles.switchContainer}>
              <Text style={styles.formLabel}>{t('scm_page.schedule_form.label_lunar_leap_month')}</Text>
              <Switch trackColor={{ false: themeColors.icon, true: themeColors.tint }} thumbColor={"#f4f3f4"} onValueChange={setLoopIsLeapMonth} value={loopIsLeapMonth} />
            </View>
            {loopIsLeapMonth && <Text style={styles.warningText}>{t('warnings.lunar_leap_month_skip')}</Text>}
          </View>
        )}

        {loopType.value !== 'minutes' && (
          <View>
            <Text style={styles.formLabel}>{t('scm_page.schedule_form.label_sending_time')}</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setShowLoopTimePicker(true)}>
              <Text style={styles.pickerButtonText}>{dayjs(loopSendingTime).format('HH:mm')}</Text>
              <Ionicons name="time-outline" size={20} color={themeColors.icon} />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.formLabel}>{t('scm_page.label_repeat')}</Text>
        <TextInput style={styles.textInput} value={repeatNumber} onChangeText={setRepeatNumber} keyboardType="number-pad" />
      </View>
    );
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={themeColors.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={isSubmitting}>
          <Ionicons name="close" size={28} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          🗓️ (SCM : {getSendingMethodText()})
        </Text>
        <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? <ActivityIndicator color={themeColors.tint} />
            : <Ionicons name="checkmark-circle" size={32} color={themeColors.tint} />
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Recipients:</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{messageData.recipients.join(', ')}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subject:</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{messageData.subject || `(${t('scm_page.label_no_title')})`}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Content:</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{contentSummary}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleNavigateToComposer}>
            <Ionicons name="pencil" size={32} color={themeColors.tint} />
          </TouchableOpacity>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Scheduling</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.schedulingContainer}>
            <View style={styles.scheduleTypeSelector}>
                <TouchableOpacity
                    style={[styles.scheduleTypeButton, scheduleType === 'loop' && styles.scheduleTypeButtonActive]}
                    onPress={() => setScheduleType('loop')}
                >
                    <Text style={[styles.scheduleTypeButtonText, scheduleType === 'loop' && styles.scheduleTypeButtonTextActive]}>
                        {t('scm_page.label_loop')}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.scheduleTypeButton, scheduleType === 'unloop' && styles.scheduleTypeButtonActive]}
                    onPress={() => setScheduleType('unloop')}
                >
                    <Text style={[styles.scheduleTypeButtonText, scheduleType === 'unloop' && styles.scheduleTypeButtonTextActive]}>
                        {t('scm_page.label_onetime')}
                    </Text>
                </TouchableOpacity>
            </View>
            
            {scheduleType === 'unloop' && (
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_specific_date')}</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowUnloopDatePicker(true)}>
                    <Text style={styles.pickerButtonText}>{dayjs(unloopDate).format('DD/MM/YYYY')}</Text>
                    <Ionicons name="calendar-outline" size={20} color={themeColors.icon} />
                </TouchableOpacity>

                <Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_sending_time')}</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowUnloopTimePicker(true)}>
                    <Text style={styles.pickerButtonText}>{dayjs(unloopDate).format('HH:mm')}</Text>
                    <Ionicons name="time-outline" size={20} color={themeColors.icon} />
                </TouchableOpacity>
              </View>
            )}

            {scheduleType === 'loop' && renderLoopInputs()}
        </View>
      </ScrollView>

      {showUnloopDatePicker && (
        <DateTimePicker
          value={unloopDate}
          mode="date"
          display="default"
          onChange={onUnloopDateChange}
        />
      )}
      {showUnloopTimePicker && (
        <DateTimePicker
          value={unloopDate}
          mode="time"
          display="default"
          onChange={onUnloopTimeChange}
        />
      )}
      {showLoopTimePicker && <DateTimePicker value={loopSendingTime} mode="time" display="default" onChange={onLoopTimeChange} />}
      
      <CustomPickerModal
        isVisible={pickerVisible}
        options={pickerOptions}
        title={pickerTitle}
        onClose={() => setPickerVisible(false)}
        onSelect={onPickerSelect}
      />
    </SafeAreaView>
  );
}


const createStyles = (themeColors: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    scrollView: { flex: 1 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.inputBorder,
      backgroundColor: themeColors.card,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: 'bold',
      color: themeColors.text,
      marginHorizontal: 10,
    },
    summaryContainer: {
      backgroundColor: themeColors.card,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.inputBorder,
    },
    summaryRow: {
      flexDirection: 'row',
      marginVertical: 4,
    },
    summaryLabel: {
      color: themeColors.icon,
      fontSize: 14,
      fontWeight: 'bold',
      width: 90,
    },
    summaryValue: {
      flex: 1,
      color: themeColors.text,
      fontSize: 14,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 15,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: themeColors.inputBorder,
    },
    dividerText: {
      marginHorizontal: 10,
      color: themeColors.icon,
      fontWeight: 'bold',
    },
    schedulingContainer: {
      paddingHorizontal: 15,
      paddingBottom: 40,
    },
    scheduleTypeSelector: {
      flexDirection: 'row',
      borderRadius: 8,
      backgroundColor: themeColors.card,
      borderWidth: 1,
      borderColor: themeColors.inputBorder,
      overflow: 'hidden',
    },
    scheduleTypeButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
    },
    scheduleTypeButtonActive: {
      backgroundColor: themeColors.tint,
    },
    scheduleTypeButtonText: {
      color: themeColors.text,
      fontWeight: 'bold',
    },
    scheduleTypeButtonTextActive: {
      color: 'white',
    },
    editButton: {
      position: 'absolute',
      bottom: 10,
      right: 15,
    },
    formSection: {
      marginTop: 20,
    },
    formLabel: {
        color: themeColors.text,
        fontSize: 16,
        marginBottom: 8,
    },
    pickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: themeColors.card,
        borderWidth: 1,
        borderColor: themeColors.inputBorder,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginBottom: 15,
    },
    pickerButtonText: {
        color: themeColors.text,
        fontSize: 16,
    },
    textInput: {
        backgroundColor: themeColors.card,
        borderWidth: 1,
        borderColor: themeColors.inputBorder,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
        marginBottom: 15,
        color: themeColors.text,
        fontSize: 16,
    },
    warningText: {
        color: themeColors.tint,
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: -10,
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        backgroundColor: themeColors.card,
        borderWidth: 1,
        borderColor: themeColors.inputBorder,
        borderRadius: 8,
        paddingHorizontal: 15,
        paddingVertical: 8,
    },
  });