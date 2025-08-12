// app/(main)/ucm/compose.tsx
// Version: 2.0.1

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, View } from 'react-native';
import Toast from 'react-native-toast-message';

import api from '../../../src/api/api';
import MessageComposer, { ActionType, MessageComposerRef, MessageData } from '../../../src/components/MessageComposer';
import { translateApiError } from '../../../src/utils/errorTranslator';
import { FollowUpMessage } from './index';

export default function UcmComposeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    messageType: 'IM' | 'FM';
    ucmId?: string;
    sendingMethod?: 'cronpost_email' | 'in_app_messaging' | 'user_email';
  }>();

  const messageComposerRef = useRef<MessageComposerRef>(null);
  const [initialData, setInitialData] = useState<Partial<MessageData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentSendingMethod, setCurrentSendingMethod] = useState(params.sendingMethod);

  useEffect(() => {
    const fetchUcmDetails = async () => {
      if (!params.ucmId) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        const response = await api.get('/api/ucm/full-state');
        const fullState = response.data;
        let messageToEdit = null;

        if (params.messageType === 'IM') {
          messageToEdit = fullState.initialMessage;
        } else {
          messageToEdit = fullState.followMessages.find((fm: FollowUpMessage) => fm.id === params.ucmId);
        }
        
        if (messageToEdit) {
            setCurrentSendingMethod(messageToEdit.sending_method);
            setInitialData({
              recipients: messageToEdit.recipients,
              subject: messageToEdit.title,
              content: messageToEdit.content,
              attachments: messageToEdit.attachments,
            });
        } else {
            Toast.show({ type: 'error', text1: t('errors.title_error'), text2: t('errors.message_not_found')});
            router.back();
        }

      } catch (error) {
        Alert.alert(t('errors.title_error'), translateApiError(error));
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchUcmDetails();
  }, [params.ucmId, params.messageType, router, t]);
  
  const saveDraft = async (data: MessageData) => {
    const isEditing = !!params.ucmId;
    const endpoint = params.messageType === 'IM' 
      ? '/api/ucm/im' 
      : (isEditing ? `/api/ucm/fm/${params.ucmId}` : '/api/ucm/fm');
    const method = isEditing ? 'PUT' : 'POST';

    const messagePayload = {
        title: data.subject,
        content: data.content,
        receiver_addresses: data.recipients,
        attachment_file_ids: data.attachments.map(f => f.id),
    };

    let payload: any = { message: messagePayload };

    if (!isEditing) {
        payload.is_draft = true;
        payload.sending_method = currentSendingMethod;
    }

    try {
        await api.request({ url: endpoint, method, data: payload });
        Toast.show({ type: 'success', text2: t('scm_page.draft_save_success') });
        router.back();
    } catch (error) {
        Alert.alert(t('errors.title_error'), translateApiError(error));
        throw error;
    }
  };

  const handleUcmAction = async (action: ActionType, data: MessageData) => {
    if (action === 'save_draft') {
      await saveDraft(data);
    }
  };

  const handleCancel = async () => {
    if (!messageComposerRef.current) {
      router.back();
      return;
    }
    const hasChanges = await messageComposerRef.current.hasUnsavedChanges();

    if (!hasChanges) {
      router.back();
      return;
    }

    const data = await messageComposerRef.current.getData();
    const isValidToSave = data.recipients.length > 0 && data.content.trim() !== '';

    if (isValidToSave) {
      Alert.alert(
        t('confirm_modal.save_draft_title'),
        t('confirm_modal.save_draft_body'),
        [
          { text: t('editor_component.btn_saveDraft'), onPress: async () => { await saveDraft(data); } },
          { text: t('confirm_modal.btn_discard_changes'), style: 'destructive', onPress: () => router.back() },
          { text: t('confirm_modal.btn_cancel'), style: 'cancel' },
        ]
      );
    } else {
      Alert.alert(
        t('confirm_modal.cannot_save_draft_title'),
        t('editor_component.alert_required_fields'),
        [
          { text: t('confirm_modal.btn_discard_changes'), style: 'destructive', onPress: () => router.back() },
          { text: t('confirm_modal.btn_continue_editing'), style: 'cancel' },
        ]
      );
    }
  };

  const handleNavigateToSchedule = (data: MessageData) => {
    if (data.recipients.length === 0 || !data.content.trim()) {
      Toast.show({ type: 'error', text1: t('errors.title_error'), text2: t('editor_component.alert_required_fields') });
      return;
    }
    
    router.push({
      pathname: '/(main)/ucm/schedule',
      params: {
        messageType: params.messageType,
        ucmId: params.ucmId,
        recipients: JSON.stringify(data.recipients),
        subject: data.subject,
        content: data.content,
        attachments: JSON.stringify(data.attachments),
        sendingMethod: currentSendingMethod,
      },
    });
  };

  if (isLoading || !currentSendingMethod) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  return (
    <MessageComposer
      ref={messageComposerRef}
      initialData={initialData}
      sendingMethod={currentSendingMethod}
      buttonSet="ucm"
      messageType={params.messageType}
      onAction={handleUcmAction}
      onCancel={handleCancel}
      onNavigateToSchedule={handleNavigateToSchedule}
    />
  );
}