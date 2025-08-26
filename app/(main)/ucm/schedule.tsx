// app/(main)/ucm/schedule.tsx
// Version: 2.3.4

import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Toast from 'react-native-toast-message';
import api from '../../../src/api/api';
import CustomPickerModal, { PickerOption } from '../../../src/components/CustomPickerModal';
import SafeDateTimePicker from '../../../src/components/SafeDateTimePicker';
import WheelPickerModal from '../../../src/components/WheelPickerModal';
import { Colors } from '../../../src/constants/Colors';
import { useAuth } from '../../../src/store/AuthContext';
import { useTheme } from '../../../src/store/ThemeContext';
import { translateApiError } from '../../../src/utils/errorTranslator';
import { FMSchedule, FollowUpMessage, IMSchedule } from './index';

type MessageType = 'IM' | 'FM';
type ScheduleMode = 'loop' | 'unloop';

export default function UcmScheduleScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const { theme } = useTheme();
    const { user } = useAuth();
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

    const [isLoading, setIsLoading] = useState(!!params.ucmId);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('loop');
    const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezone = user?.timezone || deviceTimezone;  
     
    const [imClcType, setImClcType] = useState<PickerOption>({ value: 'every_day', label: t('ucm_page.schedule_form_im.option_every_day') });
    const [imClcDaysInterval, setImClcDaysInterval] = useState('2');
    const [imClcDayOfWeek, setImClcDayOfWeek] = useState<PickerOption>({ value: 'Mon', label: t('ucm_page.day_mon') });
    const [imClcDateOfMonth, setImClcDateOfMonth] = useState('1');
    const [imClcDate, setImClcDate] = useState(new Date());
    const [imClcPromptTime, setImClcPromptTime] = useState(new Date());
    const [imWctValue, setImWctValue] = useState('24');
    const [imWctUnit, setImWctUnit] = useState<PickerOption>({ value: 'hours', label: t('ucm_page.time_unit_hours') });
    const [showImDatePicker, setShowImDatePicker] = useState(false);

    const [fmTriggerType, setFmTriggerType] = useState<PickerOption>({ value: 'days_after_im_sent', label: t('ucm_page.schedule_form_fm.option_days_after') });
    const [fmDaysAfter, setFmDaysAfter] = useState('1');
    const [fmDayOfWeek, setFmDayOfWeek] = useState<PickerOption>({ value: 'Mon', label: t('ucm_page.day_mon') });
    const [fmDateOfMonth, setFmDateOfMonth] = useState('1');
    const [fmDate, setFmDate] = useState(new Date());
    const [fmRepeat, setFmRepeat] = useState('1');
    const [showFmDatePicker, setShowFmDatePicker] = useState(false);

    const [imDateOfMonthWarning, setImDateOfMonthWarning] = useState<string | null>(null);
    const [imDateOfYearWarning, setImDateOfYearWarning] = useState<string | null>(null);
    const [fmDateOfMonthWarning, setFmDateOfMonthWarning] = useState<string | null>(null);
    const [fmDateOfYearWarning, setFmDateOfYearWarning] = useState<string | null>(null);
    const isRepeatDisabled = fmTriggerType.value === 'days_after_im_sent' && fmDaysAfter === '0';
    const [fmMonthOfYear, setFmMonthOfYear] = useState<PickerOption | null>(null);
    const [fmDayOfYear, setFmDayOfYear] = useState<PickerOption | null>(null);
    const [imMonthOfYear, setImMonthOfYear] = useState<PickerOption | null>(null);
    const [imDayOfYear, setImDayOfYear] = useState<PickerOption | null>(null);

    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerOptions, setPickerOptions] = useState<PickerOption[]>([]);
    const [pickerTitle, setPickerTitle] = useState('');
    const [currentPicker, setCurrentPicker] = useState<string | null>(null);
    const [pickerMode, setPickerMode] = useState<'list' | 'wheel' | 'time'>('list');

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

    const monthOptions = useMemo(() => {
        const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        return monthKeys.map((key, index) => ({
            value: String(index + 1),
            label: t(`ucm_page.month_${key}`),
        }));
    }, [t]);

    const dayOptionsForMonth = useMemo(() => {
        if (!fmMonthOfYear) return [];
        const month = parseInt(fmMonthOfYear.value, 10);
        const daysInMonth = dayjs().month(month - 1).daysInMonth();
        const finalDays = month === 2 ? 29 : daysInMonth;
        return Array.from({ length: finalDays }, (_, i) => ({
            value: String(i + 1),
            label: String(i + 1),
        }));
    }, [fmMonthOfYear]);

    const dayOptionsForIMMonth = useMemo(() => {
        if (!imMonthOfYear) return [];
        const month = parseInt(imMonthOfYear.value, 10);
        const daysInMonth = dayjs().month(month - 1).daysInMonth();
        const finalDays = month === 2 ? 29 : daysInMonth;
        return Array.from({ length: finalDays }, (_, i) => ({
            value: String(i + 1),
            label: String(i + 1),
        }));
    }, [imMonthOfYear]);

    const userDayjsFormat = useMemo(() => {
        if (user?.date_format === 'mm/dd/yyyy') return 'MM/DD/YYYY';
        if (user?.date_format === 'yyyy/mm/dd') return 'YYYY/MM/DD';
        return 'DD MMMM, YYYY';
    }, [user?.date_format]);

    const populateForm = useCallback((schedule: IMSchedule | FMSchedule) => {
        if (params.messageType === 'IM') {
            const imSchedule = schedule as IMSchedule;
            const isUnloop = imSchedule.clc_type === 'specific_date_in_year';
            setScheduleMode(isUnloop ? 'unloop' : 'loop');
            
            if (isUnloop && imSchedule.clc_specific_date) {
                const datePart = dayjs(imSchedule.clc_specific_date);
                const timeParts = String(imSchedule.clc_prompt_time).split(':').map(Number);
                const hour = timeParts[0] || 0;
                const minute = timeParts[1] || 0;
                const second = timeParts[2] || 0;
                const combinedDateTime = datePart.hour(hour).minute(minute).second(second);
                setImClcDate(combinedDateTime.toDate());
            } else {
                const typeOption = imClcTypeOptions.find(opt => opt.value === imSchedule.clc_type) || imClcTypeOptions[0];
                setImClcType(typeOption);
                setImClcDaysInterval(String(imSchedule.clc_day_number_interval || '2'));
                const dayOption = dayOfWeekOptions.find(d => d.value === imSchedule.clc_day_of_week) || dayOfWeekOptions[0];
                setImClcDayOfWeek(dayOption);
                setImClcDateOfMonth(String(imSchedule.clc_date_of_month || '1'));
                if (imSchedule.clc_date_of_year) {
                    const [day, month] = imSchedule.clc_date_of_year.split('/');
                    const monthNumber = parseInt(month, 10);
                    const monthOpt = monthOptions.find(m => m.value === String(monthNumber));
                    if (monthOpt) {
                        setImMonthOfYear(monthOpt);
                    }
                    const dayStr = String(parseInt(day, 10));
                    setImDayOfYear({ value: dayStr, label: dayStr });
                }
            }
            if (imSchedule.clc_prompt_time) {
                const timeParts = String(imSchedule.clc_prompt_time).split(':').map(Number);
                const todayWithServerTime = dayjs()
                    .hour(timeParts[0] || 0)
                    .minute(timeParts[1] || 0)
                    .second(timeParts[2] || 0);

                setImClcPromptTime(todayWithServerTime.toDate());
            }
            setImWctValue(String(imSchedule.wct_duration_value || '24'));
            const unitOption = wctUnitOptions.find(u => u.value === imSchedule.wct_duration_unit) || wctUnitOptions[0];
            setImWctUnit(unitOption);

        } else {
            const fmSchedule = schedule as FMSchedule;
            const isUnloop = fmSchedule.trigger_type === 'specific_date';
            setScheduleMode(isUnloop ? 'unloop' : 'loop');
            
            let finalFmDate;
            if (isUnloop && fmSchedule.specific_date_value) {
                finalFmDate = dayjs(fmSchedule.specific_date_value).toDate();
            } else {
                finalFmDate = new Date(0);
                finalFmDate.setHours(9, 0, 0, 0);
                const triggerOption = fmTriggerTypeOptions.find(opt => opt.value === fmSchedule.trigger_type) || fmTriggerTypeOptions[0];
                setFmTriggerType(triggerOption);
                setFmDaysAfter(String(fmSchedule.days_after_im_value || '1'));
                const dayOption = dayOfWeekOptions.find(d => d.value === fmSchedule.day_of_week_value) || dayOfWeekOptions[0];
                setFmDayOfWeek(dayOption);
                setFmDateOfMonth(String(fmSchedule.date_of_month_value || '1'));
                if (fmSchedule.date_of_year_value) {
                    const [day, month] = fmSchedule.date_of_year_value.split('/');
                    const monthOpt = monthOptions.find(m => m.value === String(parseInt(month, 10)));
                    setFmMonthOfYear(monthOpt || null);
                    setFmDayOfYear({ value: String(parseInt(day, 10)), label: String(parseInt(day, 10)) });
                }
            }
            if (fmSchedule.sending_time_of_day) {
                const timeParts = String(fmSchedule.sending_time_of_day).split(':').map(Number);
                finalFmDate = dayjs(finalFmDate)
                    .hour(timeParts[0] || 0)
                    .minute(timeParts[1] || 0)
                    .second(timeParts[2] || 0)
                    .toDate();
            }

            setFmDate(finalFmDate);
            setFmRepeat(String(fmSchedule.repeat_number || '1'));
        }
    }, [params.messageType, dayOfWeekOptions, imClcTypeOptions, fmTriggerTypeOptions, wctUnitOptions, monthOptions]);

    useEffect(() => {
        const defaultTime = new Date();
        defaultTime.setHours(9, 0, 0, 0);
        setImClcPromptTime(defaultTime);
        setFmDate(defaultTime);

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

    useEffect(() => {
        if (parseInt(imClcDateOfMonth, 10) > 29) {
            setImDateOfMonthWarning(t('warnings.date_of_month_skip'));
        } else {
            setImDateOfMonthWarning(null);
        }
    }, [imClcDateOfMonth, t]);

    useEffect(() => {
        if (dayjs(imClcDate).format('DD/MM') === '29/02') {
            setImDateOfYearWarning(t('warnings.feb_29_skip'));
        } else {
            setImDateOfYearWarning(null);
        }
    }, [imClcDate, t]);

    useEffect(() => {
        if (parseInt(fmDateOfMonth, 10) > 29) {
            setFmDateOfMonthWarning(t('warnings.date_of_month_skip'));
        } else {
            setFmDateOfMonthWarning(null);
        }
    }, [fmDateOfMonth, t]);

    useEffect(() => {
        if (dayjs(fmDate).format('DD/MM') === '29/02') {
            setFmDateOfYearWarning(t('warnings.feb_29_skip'));
        } else {
            setFmDateOfYearWarning(null);
        }
    }, [fmDate, t]);

    useEffect(() => {
        if (fmTriggerType.value === 'days_after_im_sent' && fmDaysAfter === '0') {
            if (fmRepeat !== '1') {
                setFmRepeat('1');
            }
        }
    }, [fmTriggerType, fmDaysAfter, fmRepeat]);

    useEffect(() => {
        if (fmDayOfYear && fmMonthOfYear) {
            const maxDays = dayOptionsForMonth.length;
            if (parseInt(fmDayOfYear.value, 10) > maxDays) {
                setFmDayOfYear({ value: String(maxDays), label: String(maxDays) });
            }
        }
        if (fmMonthOfYear?.value === '2' && fmDayOfYear?.value === '29') {
            setFmDateOfYearWarning(t('warnings.feb_29_skip'));
        } else {
            setFmDateOfYearWarning(null);
        }
    }, [fmMonthOfYear, fmDayOfYear, dayOptionsForMonth, t]);

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
                        clc_date_of_year: imClcType.value === 'date_of_year' && imDayOfYear && imMonthOfYear
                            ? `${String(imDayOfYear.value).padStart(2, '0')}/${String(imMonthOfYear.value).padStart(2, '0')}`
                            : undefined,
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
            } else {
                endpoint = isEditing ? `/api/ucm/fm/${params.ucmId}` : '/api/ucm/fm';
                if (scheduleMode === 'loop') {
                    payload.schedule = {
                        trigger_type: fmTriggerType.value,
                        sending_time_of_day: dayjs(fmDate).format('YYYY-MM-DDTHH:mm:ss'),
                        repeat_number: parseInt(fmRepeat, 10),
                        days_after_im_value: fmTriggerType.value === 'days_after_im_sent' ? parseInt(fmDaysAfter, 10) : undefined,
                        day_of_week_value: fmTriggerType.value === 'day_of_week' ? fmDayOfWeek.value : undefined,
                        date_of_month_value: fmTriggerType.value === 'date_of_month' ? parseInt(fmDateOfMonth, 10) : undefined,
                        date_of_year_value: fmTriggerType.value === 'date_of_year' && fmDayOfYear && fmMonthOfYear
                            ? `${String(fmDayOfYear.value).padStart(2, '0')}/${String(fmMonthOfYear.value).padStart(2, '0')}`
                            : undefined,
                    }
                } else {
                    const combinedDateTime = dayjs(fmDate).second(0).format('YYYY-MM-DDTHH:mm:ss');
                    
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
            router.navigate({ pathname: '/(main)/ucm' });

        } catch (error) {
            Alert.alert(t('errors.title_error'), translateApiError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const WarningText = ({ text }: { text: string | null }) => text ? <Text style={styles.warningText}>{text}</Text> : null;
    
    const openPicker = (pickerType: string, title: string, options: PickerOption[], mode: 'list' | 'wheel' | 'time' = 'list') => {
        setCurrentPicker(pickerType);
        setPickerTitle(title);
        setPickerOptions(options);
        setPickerMode(mode);
        setPickerVisible(true);
    };
    const onPickerSelect = (option: PickerOption) => {
        switch(currentPicker) {
            case 'imClcType': setImClcType(option); break;
            case 'imClcDayOfWeek': setImClcDayOfWeek(option); break;
            case 'imWctUnit': setImWctUnit(option); break;
            case 'fmTriggerType': setFmTriggerType(option); break;
            case 'fmDayOfWeek': setFmDayOfWeek(option); break;
            case 'fmMonthOfYear':
                setFmMonthOfYear(option);
                setFmDayOfYear({ value: '1', label: '1' });
                break;
            case 'fmDayOfYear': setFmDayOfYear(option); break;
            case 'imMonthOfYear':
                setImMonthOfYear(option);
                setImDayOfYear({ value: '1', label: '1' });
                break;
            case 'imDayOfYear': setImDayOfYear(option); break;
        }
    };

    const onTimeSelect = (date: Date) => {
        const newTime = dayjs(date);
        switch(currentPicker) {
            case 'imClcPromptTime':
                setImClcPromptTime(
                    dayjs(imClcPromptTime)
                    .hour(newTime.hour())
                    .minute(newTime.minute())
                    .toDate()
                );
                break;
            case 'imClcDate_time':
                setImClcDate(
                    dayjs(imClcDate)
                    .hour(newTime.hour())
                    .minute(newTime.minute())
                    .toDate()
                );
                break;
            case 'fmDate_time':
            case 'fmDateOneTime_time':
                setFmDate(
                    dayjs(fmDate)
                    .hour(newTime.hour())
                    .minute(newTime.minute())
                    .toDate()
                );
                break;
        }
    };

    const renderIMFields = () => (
        <View>
            <View style={styles.infoAlert}>
                <Ionicons name="information-circle-outline" size={20} color={themeColors.icon} style={{ marginRight: 10 }} />
                <Text style={styles.infoAlertText}>{t('ucm_page.schedule_form_im.info_alert')}</Text>
            </View>
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
                    <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('imClcType', t('ucm_page.schedule_form_im.label_loop_type'), imClcTypeOptions)}>
                        <Text style={styles.pickerButtonText}>{imClcType.label}</Text>
                        <Ionicons name="chevron-down" size={20} color={themeColors.icon} />
                    </TouchableOpacity>
                    
                    {imClcType.value === 'specific_days' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_interval')}</Text><TextInput style={styles.textInput} value={imClcDaysInterval} onChangeText={setImClcDaysInterval} keyboardType="number-pad" /></>}
                    {imClcType.value === 'day_of_week' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_day')}</Text><TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('imClcDayOfWeek', t('ucm_page.schedule_form_im.label_day'), dayOfWeekOptions)}><Text style={styles.pickerButtonText}>{imClcDayOfWeek.label}</Text><Ionicons name="chevron-down" size={20} color={themeColors.icon} /></TouchableOpacity></>}
                    {imClcType.value === 'date_of_month' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_date_of_month')}</Text><TextInput style={styles.textInput} value={imClcDateOfMonth} onChangeText={setImClcDateOfMonth} keyboardType="number-pad" /><WarningText text={imDateOfMonthWarning} /></>}
                    {imClcType.value === 'date_of_year' && (
                        <>
                            <Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_date')}</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={[styles.pickerButton, { flex: 1 }]}
                                    onPress={() => openPicker('imMonthOfYear', t('ucm_page.label_month'), monthOptions, 'wheel')}
                                >
                                    <Text style={styles.pickerButtonText}>{imMonthOfYear?.label || t('ucm_page.label_month')}</Text>
                                    <Ionicons name="chevron-down" size={20} color={themeColors.icon} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.pickerButton, { flex: 1 }]}
                                    onPress={() => openPicker('imDayOfYear', t('ucm_page.label_day'), dayOptionsForIMMonth, 'wheel')}
                                    disabled={!imMonthOfYear}
                                >
                                    <Text style={[styles.pickerButtonText, !imMonthOfYear && { color: themeColors.icon }]}>
                                        {imDayOfYear?.label || t('ucm_page.label_day')}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={themeColors.icon} />
                                </TouchableOpacity>
                            </View>
                            <WarningText text={imDateOfYearWarning} />
                        </>
                    )}
                    <Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_prompt_time')}</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('imClcPromptTime', t('ucm_page.schedule_form_im.label_prompt_time'), [], 'time')}>
                        <Text style={styles.pickerButtonText}>{dayjs(imClcPromptTime).format('HH:mm')}</Text>
                        <Ionicons name="time-outline" size={20} color={themeColors.icon} />
                    </TouchableOpacity>
                </>
            ) : (
                 <>
                    <Text style={styles.formLabel}>{t('scm_page.schedule_form.label_date')}</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setShowImDatePicker(true)}>
                        <Text style={styles.pickerButtonText}>{dayjs(imClcDate).format(userDayjsFormat)}</Text>
                        <Ionicons name="calendar-outline" size={20} color={themeColors.icon} />
                    </TouchableOpacity>

                    <Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_prompt_time')}</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('imClcDate_time', t('ucm_page.schedule_form_im.label_prompt_time'), [], 'time')}>
                        <Text style={styles.pickerButtonText}>{dayjs(imClcDate).format('HH:mm')}</Text>
                        <Ionicons name="time-outline" size={20} color={themeColors.icon} />
                    </TouchableOpacity>
                </>
            )}
            <View style={styles.dividerLine} />
            <Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_wct')}</Text>
            <View style={{flexDirection: 'row', gap: 10}}>
                <TextInput style={[styles.textInput, {flex: 1}]} value={imWctValue} onChangeText={setImWctValue} keyboardType="number-pad" />
                <TouchableOpacity style={[styles.pickerButton, {flex: 1}]} onPress={() => openPicker('imWctUnit', t('ucm_page.schedule_form_im.label_wct'), wctUnitOptions)}>
                    <Text style={styles.pickerButtonText}>{imWctUnit.label}</Text>
                    <Ionicons name="chevron-down" size={20} color={themeColors.icon} />
                </TouchableOpacity>
            </View>
            <Text style={styles.noteText}>{t('ucm_page.schedule_form_im.note_wct')}</Text>
        </View>
    );

    const renderFMFields = () => (
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
                    <Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_trigger_type')}</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('fmTriggerType', t('ucm_page.schedule_form_fm.label_trigger_type'), fmTriggerTypeOptions)}>
                        <Text style={styles.pickerButtonText}>{fmTriggerType.label}</Text>
                        <Ionicons name="chevron-down" size={20} color={themeColors.icon} />
                    </TouchableOpacity>

                    {fmTriggerType.value === 'days_after_im_sent' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_days_after')}</Text><TextInput style={styles.textInput} value={fmDaysAfter} onChangeText={setFmDaysAfter} keyboardType="number-pad" /></>}
                    {fmTriggerType.value === 'day_of_week' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_day')}</Text><TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('fmDayOfWeek', t('ucm_page.schedule_form_im.label_day'), dayOfWeekOptions)}><Text style={styles.pickerButtonText}>{fmDayOfWeek.label}</Text><Ionicons name="chevron-down" size={20} color={themeColors.icon} /></TouchableOpacity></>}
                    {fmTriggerType.value === 'date_of_month' && <><Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_date_of_month')}</Text><TextInput style={styles.textInput} value={fmDateOfMonth} onChangeText={setFmDateOfMonth} keyboardType="number-pad" /><WarningText text={fmDateOfMonthWarning} /></>}
                    {fmTriggerType.value === 'date_of_year' && (
                        <>
                            <Text style={styles.formLabel}>{t('ucm_page.schedule_form_im.label_date')}</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>

                                <TouchableOpacity
                                    style={[styles.pickerButton, { flex: 1 }]}
                                    onPress={() => openPicker('fmMonthOfYear', t('ucm_page.label_month'), monthOptions, 'wheel')}
                                >
                                    <Text style={styles.pickerButtonText}>{fmMonthOfYear?.label || t('ucm_page.label_month')}</Text>
                                    <Ionicons name="chevron-down" size={20} color={themeColors.icon} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.pickerButton, { flex: 1 }]}
                                    onPress={() => openPicker('fmDayOfYear', t('ucm_page.label_day'), dayOptionsForMonth, 'wheel')}
                                    disabled={!fmMonthOfYear}
                                >
                                    <Text style={[styles.pickerButtonText, !fmMonthOfYear && { color: themeColors.icon }]}>
                                        {fmDayOfYear?.label || t('ucm_page.label_day')}
                                    </Text>
                                    <Ionicons name="chevron-down" size={20} color={themeColors.icon} />
                                </TouchableOpacity>

                            </View>
                            <WarningText text={fmDateOfYearWarning} />
                        </>
                    )}
                    
                    <Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_sending_time')}</Text>
                    
                    <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('fmDate_time', t('ucm_page.schedule_form_fm.label_sending_time'), [], 'time')}>
                        <Text style={styles.pickerButtonText}>{dayjs(fmDate).format('HH:mm')}</Text>
                        <Ionicons name="time-outline" size={20} color={themeColors.icon} />
                    </TouchableOpacity>
                    
                    <Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_repetitions')}</Text>
                    <TextInput 
                        style={[styles.textInput, isRepeatDisabled && { backgroundColor: themeColors.inputBorder, color: themeColors.icon }]} 
                        value={fmRepeat} 
                        onChangeText={setFmRepeat} 
                        keyboardType="number-pad"
                        editable={!isRepeatDisabled}
                    />
                </>
            ) : (
                <>
                    <Text style={styles.formLabel}>{t('scm_page.schedule_form.label_date')}</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setShowFmDatePicker(true)}>
                        <Text style={styles.pickerButtonText}>{dayjs(fmDate).format(userDayjsFormat)}</Text>
                        <Ionicons name="calendar-outline" size={20} color={themeColors.icon} />
                    </TouchableOpacity>

                    <Text style={styles.formLabel}>{t('ucm_page.schedule_form_fm.label_sending_time')}</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('fmDateOneTime_time', t('ucm_page.schedule_form_fm.label_sending_time'), [], 'time')}>
                        <Text style={styles.pickerButtonText}>{dayjs(fmDate).format('HH:mm')}</Text>
                        <Ionicons name="time-outline" size={20} color={themeColors.icon} />
                    </TouchableOpacity>
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

        <KeyboardAwareScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Recipients:</Text><Text style={styles.summaryValue} numberOfLines={1}>{messageData.recipients.join(', ')}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subject:</Text><Text style={styles.summaryValue} numberOfLines={1}>{messageData.subject || `(${t('scm_page.label_no_title')})`}</Text></View>
              <TouchableOpacity style={styles.editButton} onPress={() => router.back()}><Ionicons name="pencil" size={24} color={themeColors.tint} /></TouchableOpacity>
            </View>
            <View style={styles.dividerContainer}><View style={styles.dividerLine} /><Text style={styles.dividerText}>Scheduling</Text><View style={styles.dividerLine} /></View>
            <View style={styles.schedulingContainer}>{params.messageType === 'IM' ? renderIMFields() : renderFMFields()}</View>
        </KeyboardAwareScrollView>
        <SafeDateTimePicker
            isVisible={showImDatePicker}
            value={imClcDate}
            mode="date"
            onClose={() => setShowImDatePicker(false)}
            onSelect={(date) => {
                const newSelection = dayjs(date);
                const updatedDate = dayjs(imClcDate)
                    .year(newSelection.year())
                    .month(newSelection.month())
                    .date(newSelection.date());
                setImClcDate(updatedDate.toDate());
            }}
            timeZoneName={timezone}
        />
        <SafeDateTimePicker
            isVisible={showFmDatePicker}
            value={fmDate}
            mode="date"
            onClose={() => setShowFmDatePicker(false)}
            onSelect={(date) => {
                const newSelection = dayjs(date);
                const updatedDate = dayjs(fmDate)
                    .year(newSelection.year())
                    .month(newSelection.month())
                    .date(newSelection.date());
                setFmDate(updatedDate.toDate());
            }}
            timeZoneName={timezone}
        />
        {pickerMode === 'list' && (
            <CustomPickerModal
                isVisible={pickerVisible}
                options={pickerOptions}
                title={pickerTitle}
                onClose={() => setPickerVisible(false)}
                onSelect={onPickerSelect}
            />
        )}
        {(pickerMode === 'wheel' || pickerMode === 'time') && (
            <WheelPickerModal
                isVisible={pickerVisible}
                options={pickerOptions}
                title={pickerTitle}
                initialValue={
                    currentPicker === 'fmMonthOfYear' ? fmMonthOfYear :
                    currentPicker === 'fmDayOfYear' ? fmDayOfYear :
                    currentPicker === 'imMonthOfYear' ? imMonthOfYear :
                    currentPicker === 'imDayOfYear' ? imDayOfYear :
                    null
                }
                onClose={() => setPickerVisible(false)}
                onSelect={onPickerSelect}
                mode={pickerMode === 'time' ? 'time' : 'single'}
                initialTimeValue={
                    currentPicker === 'imClcPromptTime' ? imClcPromptTime :
                    currentPicker === 'imClcDate_time' ? imClcDate :
                    (currentPicker === 'fmDate_time' || currentPicker === 'fmDateOneTime_time') ? fmDate :
                    new Date()
                }
                onTimeSelect={onTimeSelect}
            />
        )}
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
    warningText: {
        color: themeColors.tint,
        fontSize: 12,
        marginTop: -10,
        marginBottom: 15,
    },
    infoAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: themeColors.card,
        borderRadius: 8,
        padding: 15,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: themeColors.tint,
    },
    infoAlertText: {
        flex: 1,
        color: themeColors.text,
        fontSize: 13,
        lineHeight: 18,
    },
    noteText: {
        color: themeColors.icon,
        fontSize: 12,
        marginTop: -10,
        marginBottom: 15,
    },
    
});