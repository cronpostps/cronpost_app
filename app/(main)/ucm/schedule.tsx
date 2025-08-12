// app/(main)/ucm/schedule.tsx
// Version: 2.0.1

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
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
import { FMSchedule, FollowUpMessage, IMSchedule } from './index'; // Import types from index

// --- Type Definitions ---
type MessageType = 'IM' | 'FM';
type ScheduleMode = 'loop' | 'unloop';

export default function UcmScheduleScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { theme } = useTheme();
    const themeColors = Colors[theme];
    const styles = createStyles(themeColors);

    const params = useLocalSearchParams<{
        messageType: MessageType;
        ucmId?: string;
        recipients: string;
        subject: string;
        content: string;
        attachments: string;
        sendingMethod: 'in_app_messaging' | 'cronpost_email' | 'user_email';
    }>();
    
    const messageData = useMemo(() => ({
        recipients: JSON.parse(params.recipients || '[]'),
        subject: params.subject,
        content: params.content,
        attachments: JSON.parse(params.attachments || '[]'),
        sendingMethod: params.sendingMethod,
    }), [params]);

    // --- Common State ---
    const [isLoading, setIsLoading] = useState(!!params.ucmId);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('loop');
    
    // --- IM State ---
    const [imClcType, setImClcType] = useState<PickerOption>({ value: 'every_day', label: t('ucm_page.schedule_form_im.option_every_day') });
    const [imClcDaysInterval, setImClcDaysInterval] = useState('2');
    const [imClcDayOfWeek, setImClcDayOfWeek] = useState<PickerOption>({ value: 'Mon', label: t('ucm_page.day_mon') });
    const [imClcDateOfMonth, setImClcDateOfMonth] = useState('1');
    const [imClcDate, setImClcDate] = useState(new Date()); // For date_of_year and unloop
    const [imClcPromptTime, setImClcPromptTime] = useState(new Date());
    const [imWctValue, setImWctValue] = useState('24');
    const [imWctUnit, setImWctUnit] = useState<PickerOption>({ value: 'hours', label: t('ucm_page.time_unit_hours') });
    const [showImDatePicker, setShowImDatePicker] = useState(false);
    const [showImTimePicker, setShowImTimePicker] = useState(false);

    // --- FM State ---
    const [fmTriggerType, setFmTriggerType] = useState<PickerOption>({ value: 'days_after_im_sent', label: t('ucm_page.schedule_form_fm.option_days_after') });
    const [fmDaysAfter, setFmDaysAfter] = useState('1');
    const [fmDayOfWeek, setFmDayOfWeek] = useState<PickerOption>({ value: 'Mon', label: t('ucm_page.day_mon') });
    const [fmDateOfMonth, setFmDateOfMonth] = useState('1');
    const [fmDate, setFmDate] = useState(new Date()); // For date_of_year and unloop
    const [fmSendingTime, setFmSendingTime] = useState(new Date());
    const [fmRepeat, setFmRepeat] = useState('1');
    const [showFmDatePicker, setShowFmDatePicker] = useState(false);
    const [showFmTimePicker, setShowFmTimePicker] = useState(false);

    // --- Picker State ---
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerOptions, setPickerOptions] = useState<PickerOption[]>([]);
    const [pickerTitle, setPickerTitle] = useState('');
    const [currentPicker, setCurrentPicker] = useState<string | null>(null);

    // --- Memoized Options ---
    const dayOfWeekOptions = useMemo(() => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ value: day, label: t(`ucm_page.day_${day.toLowerCase()}`) })), [t]);
    const imClcTypeOptions = useMemo(() => [
        { value: 'every_day', label: t('ucm_page.schedule_form_im.option_every_day') },
        { value: 'specific_days', label: t('ucm_page.schedule_form_im.option_specific_days') },
        { value: 'day_of_week', label: t('ucm_page.schedule_form_im.option_day_of_week') },
        { value: 'date_of_month', label: t('ucm_page.schedule_form_im.option_date_of_month') },
        { value: 'date_of_year', label: t('ucm_page.schedule_form_im.option_date_of_year') },
    ], [t]);
    const fmTriggerTypeOptions = useMemo(() => [
        { value: 'days_after_im_sent', label: t('ucm_page.schedule_form_fm.option_days_after') },
        { value: 'day_of_week', label: t('ucm_page.schedule_form_fm.option_day_of_week') },
        { value: 'date_of_month', label: t('ucm_page.schedule_form_fm.option_date_of_month') },
        { value: 'date_of_year', label: t('ucm_page.schedule_form_fm.option_date_of_year') },
    ], [t]);
    const wctUnitOptions = useMemo(() => [
        { value: 'hours', label: t('ucm_page.time_unit_hours') },
        { value: 'minutes', label: t('ucm_page.time_unit_mins') }
    ], [t]);

    const populateForm = useCallback((schedule: IMSchedule | FMSchedule) => {
        if (params.messageType === 'IM') {
            const imSchedule = schedule as IMSchedule;
            const isUnloop = imSchedule.clc_type === 'specific_date_in_year';
            setScheduleMode(isUnloop ? 'unloop' : 'loop');
            
            if (isUnloop && imSchedule.clc_specific_date) {
                setImClcDate(dayjs(imSchedule.clc_specific_date).toDate());
            } else {
                const typeOption = imClcTypeOptions.find(opt => opt.value === imSchedule.clc_type) || imClcTypeOptions[0];
                setImClcType(typeOption);
                setImClcDaysInterval(String(imSchedule.clc_day_number_interval || '2'));
                const dayOption = dayOfWeekOptions.find(d => d.value === imSchedule.clc_day_of_week) || dayOfWeekOptions[0];
                setImClcDayOfWeek(dayOption);
                setImClcDateOfMonth(String(imSchedule.clc_date_of_month || '1'));
                if (imSchedule.clc_date_of_year) {
                    const [day, month] = imSchedule.clc_date_of_year.split('/');
                    const newDate = new Date();
                    newDate.setMonth(parseInt(month, 10) - 1, parseInt(day, 10));
                    setImClcDate(newDate);
                }
            }
            if (imSchedule.clc_prompt_time) setImClcPromptTime(dayjs(`1970-01-01T${imSchedule.clc_prompt_time}`).toDate());
            setImWctValue(String(imSchedule.wct_duration_value || '24'));
            const unitOption = wctUnitOptions.find(u => u.value === imSchedule.wct_duration_unit) || wctUnitOptions[0];
            setImWctUnit(unitOption);

        } else { // FM
            const fmSchedule = schedule as FMSchedule;
            const isUnloop = fmSchedule.trigger_type === 'specific_date';
            setScheduleMode(isUnloop ? 'unloop' : 'loop');
            
            if (isUnloop && fmSchedule.specific_date_value) {
                setFmDate(dayjs(fmSchedule.specific_date_value).toDate());
            } else {
                const triggerOption = fmTriggerTypeOptions.find(opt => opt.value === fmSchedule.trigger_type) || fmTriggerTypeOptions[0];
                setFmTriggerType(triggerOption);
                setFmDaysAfter(String(fmSchedule.days_after_im_value || '1'));
                const dayOption = dayOfWeekOptions.find(d => d.value === fmSchedule.day_of_week_value) || dayOfWeekOptions[0];
                setFmDayOfWeek(dayOption);
                setFmDateOfMonth(String(fmSchedule.date_of_month_value || '1'));
                 if (fmSchedule.date_of_year_value) {
                    const [day, month] = fmSchedule.date_of_year_value.split('/');
                    const newDate = new Date();
                    newDate.setMonth(parseInt(month, 10) - 1, parseInt(day, 10));
                    setFmDate(newDate);
                }
            }
            if (fmSchedule.sending_time_of_day) setFmSendingTime(dayjs(`1970-01-01T${fmSchedule.sending_time_of_day}`).toDate());
            setFmRepeat(String(fmSchedule.repeat_number || '1'));
        }
    }, [params.messageType, dayOfWeekOptions, imClcTypeOptions, fmTriggerTypeOptions, wctUnitOptions]);

    // --- Effects ---
    useEffect(() => {
        const defaultTime = new Date();
        defaultTime.setHours(9, 0, 0, 0);
        setImClcPromptTime(defaultTime);
        setFmSendingTime(defaultTime);

        const fetchSchedule = async () => {
            if (!params.ucmId) {
                setIsLoading(false);
                return;
            }
            try {
                const response = await api.get('/api/ucm/full-state');
                const fullState = response.data;
                let scheduleToEdit: IMSchedule | FMSchedule | undefined | null = null;
                let messageToEdit;

                if (params.messageType === 'IM') {
                    messageToEdit = fullState.initialMessage;
                    scheduleToEdit = messageToEdit?.schedule;
                } else {
                    messageToEdit = fullState.followMessages.find((fm: FollowUpMessage) => fm.id === params.ucmId);
                    scheduleToEdit = messageToEdit?.schedule;
                }
                
                if (scheduleToEdit) {
                    populateForm(scheduleToEdit);
                }

            } catch (error) {
                Toast.show({ type: 'error', text1: t('errors.title_error'), text2: translateApiError(error) });
            } finally {
                setIsLoading(false);
            }
        };

        fetchSchedule();
    }, [params.ucmId, params.messageType, t, populateForm]);
    
    // --- Handlers ---
    const handleSubmit = async () => {
        setIsSubmitting(true);
        let payload: any = {
            message: {
                title: messageData.subject,
                content: messageData.content,
                receiver_addresses: messageData.recipients,
                attachment_file_ids: messageData.attachments.map((f: any) => f.id),
            },
            schedule: {},
        };
        
        let endpoint = '';
        const isEditing = !!params.ucmId;

        try {
            if (params.messageType === 'IM') {
                endpoint = '/api/ucm/im';
                if (scheduleMode === 'loop') {
                    payload.schedule = {
                        clc_type: imClcType.value,
                        clc_prompt_time: dayjs(imClcPromptTime).format('YYYY-MM-DDTHH:mm:ss'),
                        wct_duration_value: parseInt(imWctValue, 10),
                        wct_duration_unit: imWctUnit.value,
                        clc_day_number_interval: imClcType.value === 'specific_days' ? parseInt(imClcDaysInterval, 10) : undefined,
                        clc_day_of_week: imClcType.value === 'day_of_week' ? imClcDayOfWeek.value : undefined,
                        clc_date_of_month: imClcType.value === 'date_of_month' ? parseInt(imClcDateOfMonth, 10) : undefined,
                        clc_date_of_year: imClcType.value === 'date_of_year' ? dayjs(imClcDate).format('DD/MM') : undefined,
                    };
                } else {
                    const combinedDateTime = dayjs(imClcDate).format('YYYY-MM-DDTHH:mm:ss');
                    payload.schedule = {
                        clc_type: 'specific_date_in_year',
                        clc_specific_date: combinedDateTime,
                        clc_prompt_time: combinedDateTime,
                        wct_duration_value: parseInt(imWctValue, 10),
                        wct_duration_unit: imWctUnit.value,
                    };
                }
            } else { // FM
                endpoint = isEditing ? `/api/ucm/fm/${params.ucmId}` : '/api/ucm/fm';
                 if (scheduleMode === 'loop') {
                    payload.schedule = {
                        trigger_type: fmTriggerType.value,
                        sending_time_of_day: dayjs(fmSendingTime).format('YYYY-MM-DDTHH:mm:ss'),
                        repeat_number: parseInt(fmRepeat, 10),
                        days_after_im_value: fmTriggerType.value === 'days_after_im_sent' ? parseInt(fmDaysAfter, 10) : undefined,
                        day_of_week_value: fmTriggerType.value === 'day_of_week' ? fmDayOfWeek.value : undefined,
                        date_of_month_value: fmTriggerType.value === 'date_of_month' ? parseInt(fmDateOfMonth, 10) : undefined,
                        date_of_year_value: fmTriggerType.value === 'date_of_year' ? dayjs(fmDate).format('DD/MM') : undefined,
                    }
                } else {
                    const combinedDateTime = dayjs(fmDate).format('YYYY-MM-DDTHH:mm:ss');
                    payload.schedule = {
                        trigger_type: 'specific_date',
                        specific_date_value: combinedDateTime,
                        sending_time_of_day: combinedDateTime,
                        repeat_number: 1,
                    }
                }
            }

            if (isEditing) {
                await api.put(endpoint, payload);
            } else {
                payload.sending_method = messageData.sendingMethod;
                await api.post(endpoint, payload);
            }
            
            Toast.show({ type: 'success', text2: t('prompts.ucm_save_success')});
            router.replace({ pathname: '/(main)/ucm' });

        } catch (error) {
            Alert.alert(t('errors.title_error'), translateApiError(error));
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // --- Picker and DateTime Handlers ---
    const openPicker = (pickerName: string, title: string, options: PickerOption[]) => { setCurrentPicker(pickerName); setPickerTitle(title); setPickerOptions(options); setPickerVisible(true); };
    const onPickerSelect = (option: PickerOption) => {
        switch(currentPicker) {
            case 'imClcType': setImClcType(option); break;
            case 'imClcDayOfWeek': setImClcDayOfWeek(option); break;
            case 'imWctUnit': setImWctUnit(option); break;
            case 'fmTriggerType': setFmTriggerType(option); break;
            case 'fmDayOfWeek': setFmDayOfWeek(option); break;
        }
    };
    const onDateTimeChange = (setter: React.Dispatch<React.SetStateAction<Date>>, setShow: React.Dispatch<React.SetStateAction<boolean>>) => (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShow(Platform.OS === 'ios');
        if (selectedDate) setter(selectedDate);
    };

    // --- Render Functions ---
    const renderIMFields = () => (
        <View>
            <View style={styles.scheduleTypeSelector}>
                <TouchableOpacity style={[styles.scheduleTypeButton, scheduleMode === 'loop' && styles.scheduleTypeButtonActive]} onPress={() => setScheduleMode('loop')}>
                    <Text style={[styles.scheduleTypeButtonText, scheduleMode === 'loop' && styles.scheduleTypeButtonTextActive]}>{t('ucm_page.schedule_form_im.label_loop')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.scheduleTypeButton, scheduleMode === 'unloop' && styles.scheduleTypeButtonActive]} onPress={() => setScheduleMode('unloop')}>
                    <Text style={[styles.scheduleTypeButtonText, scheduleMode === 'unloop' && styles.scheduleTypeButtonTextActive]}>{t('ucm_page.schedule_form_im.label_onetime')}</Text>
                </TouchableOpacity>
            </View>

            {scheduleMode === 'loop' ? (
                <>
                <Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_loop_type')}</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('imClcType', 'Loop Type', imClcTypeOptions)}><Text style={styles.pickerButtonText}>{imClcType.label}</Text><Ionicons name="chevron-down" size={20} color={themeColors.icon} /></TouchableOpacity>
                {imClcType.value === 'specific_days' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_interval')}</Text><TextInput style={styles.textInput} value={imClcDaysInterval} onChangeText={setImClcDaysInterval} keyboardType="number-pad" /></>}
                {imClcType.value === 'day_of_week' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_day')}</Text><TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('imClcDayOfWeek', 'Day of Week', dayOfWeekOptions)}><Text style={styles.pickerButtonText}>{imClcDayOfWeek.label}</Text></TouchableOpacity></>}
                {imClcType.value === 'date_of_month' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_date_of_month')}</Text><TextInput style={styles.textInput} value={imClcDateOfMonth} onChangeText={setImClcDateOfMonth} keyboardType="number-pad" /></>}
                {imClcType.value === 'date_of_year' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_date')}</Text><TouchableOpacity style={styles.pickerButton} onPress={() => setShowImDatePicker(true)}><Text style={styles.pickerButtonText}>{dayjs(imClcDate).format('DD MMMM')}</Text></TouchableOpacity></>}
                <Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_prompt_time')}</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowImTimePicker(true)}><Text style={styles.pickerButtonText}>{dayjs(imClcPromptTime).format('HH:mm')}</Text></TouchableOpacity>
                </>
            ) : (
                 <>
                    <Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_specific_date')}</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setShowImDatePicker(true)}><Text style={styles.pickerButtonText}>{dayjs(imClcDate).format('DD MMMM, YYYY HH:mm')}</Text></TouchableOpacity>
                </>
            )}
            <View style={styles.dividerLine} />
            <Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_wct')}</Text>
            <View style={{flexDirection: 'row', gap: 10}}>
                <TextInput style={[styles.textInput, {flex: 1}]} value={imWctValue} onChangeText={setImWctValue} keyboardType="number-pad" />
                <TouchableOpacity style={[styles.pickerButton, {flex: 1, marginBottom: 15}]} onPress={() => openPicker('imWctUnit', 'WCT Unit', wctUnitOptions)}><Text style={styles.pickerButtonText}>{imWctUnit.label}</Text></TouchableOpacity>
            </View>
        </View>
    );

    const renderFMFields = () => (
         <View>
            <View style={styles.scheduleTypeSelector}>
                <TouchableOpacity style={[styles.scheduleTypeButton, scheduleMode === 'loop' && styles.scheduleTypeButtonActive]} onPress={() => setScheduleMode('loop')}><Text style={[styles.scheduleTypeButtonText, scheduleMode === 'loop' && styles.scheduleTypeButtonTextActive]}>{t('ucm_page.schedule_form_im.label_loop')}</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.scheduleTypeButton, scheduleMode === 'unloop' && styles.scheduleTypeButtonActive]} onPress={() => setScheduleMode('unloop')}><Text style={[styles.scheduleTypeButtonText, scheduleMode === 'unloop' && styles.scheduleTypeButtonTextActive]}>{t('ucm_page.schedule_form_im.label_onetime')}</Text></TouchableOpacity>
            </View>

            {scheduleMode === 'loop' ? (
                <>
                <Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_trigger_type')}</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('fmTriggerType', 'Trigger Type', fmTriggerTypeOptions)}><Text style={styles.pickerButtonText}>{fmTriggerType.label}</Text><Ionicons name="chevron-down" size={20} color={themeColors.icon} /></TouchableOpacity>
                {fmTriggerType.value === 'days_after_im_sent' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_days_after')}</Text><TextInput style={styles.textInput} value={fmDaysAfter} onChangeText={setFmDaysAfter} keyboardType="number-pad" /></>}
                {fmTriggerType.value === 'day_of_week' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_day')}</Text><TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('fmDayOfWeek', 'Day of Week', dayOfWeekOptions)}><Text style={styles.pickerButtonText}>{fmDayOfWeek.label}</Text></TouchableOpacity></>}
                {fmTriggerType.value === 'date_of_month' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_date_of_month')}</Text><TextInput style={styles.textInput} value={fmDateOfMonth} onChangeText={setFmDateOfMonth} keyboardType="number-pad" /></>}
                {fmTriggerType.value === 'date_of_year' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_date')}</Text><TouchableOpacity style={styles.pickerButton} onPress={() => setShowFmDatePicker(true)}><Text style={styles.pickerButtonText}>{dayjs(fmDate).format('DD MMMM')}</Text></TouchableOpacity></>}
                <Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_sending_time')}</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowFmTimePicker(true)}><Text style={styles.pickerButtonText}>{dayjs(fmSendingTime).format('HH:mm')}</Text></TouchableOpacity>
                <Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_repetitions')}</Text>
                <TextInput style={styles.textInput} value={fmRepeat} onChangeText={setFmRepeat} keyboardType="number-pad" />
                </>
            ) : (
                <>
                <Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_specific_date')}</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowFmDatePicker(true)}><Text style={styles.pickerButtonText}>{dayjs(fmDate).format('DD MMMM, YYYY HH:mm')}</Text></TouchableOpacity>
                </>
            )}
        </View>
    );

    const getHeaderTitle = () => {
        const type = params.messageType === 'IM' ? 'IM' : 'FM';
        const method = { 'in_app_messaging': 'In-App', 'cronpost_email': 'CP-Email', 'user_email': 'SMTP' }[messageData.sendingMethod || ''] || '';
        return `🗓️ (${type} : ${method})`;
    };
    
    if (isLoading) return <View style={[styles.container, {justifyContent: 'center'}]}><ActivityIndicator size="large" /></View>

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} disabled={isSubmitting}><Ionicons name="close" size={28} color={themeColors.text} /></TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{getHeaderTitle()}</Text>
            <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color={themeColors.tint} /> : <Ionicons name="checkmark-circle" size={34} color={themeColors.tint} />}</TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Recipients:</Text><Text style={styles.summaryValue} numberOfLines={1}>{messageData.recipients.join(', ')}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subject:</Text><Text style={styles.summaryValue} numberOfLines={1}>{messageData.subject || `(${t('scm_page.label_no_title')})`}</Text></View>
              <TouchableOpacity style={styles.editButton} onPress={() => router.back()}><Ionicons name="pencil" size={24} color={themeColors.tint} /></TouchableOpacity>
            </View>
            <View style={styles.dividerContainer}><View style={styles.dividerLine} /><Text style={styles.dividerText}>Scheduling</Text><View style={styles.dividerLine} /></View>
            <View style={styles.schedulingContainer}>{params.messageType === 'IM' ? renderIMFields() : renderFMFields()}</View>
        </ScrollView>
        {showImDatePicker && <DateTimePicker value={imClcDate} mode="datetime" display="default" onChange={onDateTimeChange(setImClcDate, setShowImDatePicker)} />}
        {showImTimePicker && <DateTimePicker value={imClcPromptTime} mode="time" display="default" onChange={onDateTimeChange(setImClcPromptTime, setShowImTimePicker)} />}
        {showFmDatePicker && <DateTimePicker value={fmDate} mode="datetime" display="default" onChange={onDateTimeChange(setFmDate, setShowFmDatePicker)} />}
        {showFmTimePicker && <DateTimePicker value={fmSendingTime} mode="time" display="default" onChange={onDateTimeChange(setFmSendingTime, setShowFmTimePicker)} />}
        <CustomPickerModal isVisible={pickerVisible} options={pickerOptions} title={pickerTitle} onClose={() => setPickerVisible(false)} onSelect={onPickerSelect} />
    </SafeAreaView>
  );
}

const createStyles = (themeColors: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    scrollView: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: themeColors.inputBorder, backgroundColor: themeColors.card, },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: 'bold', color: themeColors.text, marginHorizontal: 10, },
    summaryContainer: { backgroundColor: themeColors.card, paddingVertical: 10, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: themeColors.inputBorder, },
    summaryRow: { flexDirection: 'row', marginVertical: 4, },
    summaryLabel: { color: themeColors.icon, fontSize: 14, fontWeight: 'bold', width: 90, },
    summaryValue: { flex: 1, color: themeColors.text, fontSize: 14, },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, paddingHorizontal: 15, },
    dividerLine: { flex: 1, height: 1, backgroundColor: themeColors.inputBorder, },
    dividerText: { marginHorizontal: 10, color: themeColors.icon, fontWeight: 'bold', },
    schedulingContainer: { paddingHorizontal: 15, paddingBottom: 40, },
    scheduleTypeSelector: { flexDirection: 'row', borderRadius: 8, backgroundColor: themeColors.card, borderWidth: 1, borderColor: themeColors.inputBorder, overflow: 'hidden', marginBottom: 20, },
    scheduleTypeButton: { flex: 1, paddingVertical: 12, alignItems: 'center', },
    scheduleTypeButtonActive: { backgroundColor: themeColors.tint, },
    scheduleTypeButtonText: { color: themeColors.text, fontWeight: 'bold', },
    scheduleTypeButtonTextActive: { color: 'white', },
    editButton: { position: 'absolute', bottom: 10, right: 15, },
    formLabel: { color: themeColors.text, fontSize: 16, marginBottom: 8, marginTop: 10 },
    pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: themeColors.card, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, marginBottom: 15, },
    pickerButtonText: { color: themeColors.text, fontSize: 16, },
    textInput: { backgroundColor: themeColors.card, borderWidth: 1, borderColor: themeColors.inputBorder, borderRadius: 8, paddingHorizontal: 15, paddingVertical: Platform.OS === 'ios' ? 12 : 8, marginBottom: 15, color: themeColors.text, fontSize: 16, },
});