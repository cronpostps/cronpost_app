// app/(main)/scm/compose.tsx
// Version: 2.1.0

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, View } from 'react-native';
import Toast from 'react-native-toast-message';

import api from '../../../src/api/api';
import MessageComposer, { ActionType, AttachmentFile, MessageComposerRef, MessageData } from '../../../src/components/MessageComposer';
import { translateApiError } from '../../../src/utils/errorTranslator';

export default function ScmComposeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ scmId?: string, sendingMethod?: 'cronpost_email' | 'in_app_messaging' | 'user_email' }>();
  
  const messageComposerRef = useRef<MessageComposerRef>(null);
  const [initialData, setInitialData] = useState<Partial<MessageData>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchScmDetails = async () => {
      if (!params.scmId) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const response = await api.get(`/api/scm/${params.scmId}`);
        const scmData = response.data;
        
        const composerData: Partial<MessageData> = {
          recipients: scmData.receiver_addresses.map((r: { email: string }) => r.email),
          subject: scmData.subject,
          content: scmData.content, // Lấy content thay vì content_html
          attachments: scmData.attachments as AttachmentFile[],
        };
        setInitialData(composerData);

      } catch (error) {
        Alert.alert(t('errors.title_error'), translateApiError(error));
        router.back();
      } finally {
        setIsLoading(false);
      }
    };
    fetchScmDetails();
  }, [params.scmId, router, t]);

  const handleScmAction = async (action: ActionType, data: MessageData) => {
    const payload = {
      scm_id: params.scmId,
      sending_method: params.sendingMethod,
      recipient_emails: data.recipients,
      subject: data.subject,
      content: data.content,
      attachment_file_ids: data.attachments.map(f => f.id),
    };

    try {
      if (action === 'save_draft') {
        if (params.scmId) {
          await api.put(`/api/scm/${params.scmId}`, payload);
        } else {
          await api.post('/api/scm/', payload);
        }
        Toast.show({ type: 'success', text2: t('scm_page.draft_save_success') });
        router.back();
      } else if (action === 'schedule') {
        // Xử lý schedule ở đây trong tương lai
      }
    } catch (error) {
      Alert.alert(t('errors.title_error'), translateApiError(error));
      throw error;
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
          {
            text: t('editor_component.btn_saveDraft'),
            onPress: async () => {
              await handleScmAction('save_draft', data);
            },
          },
          {
            text: t('confirm_modal.btn_discard_changes'),
            style: 'destructive',
            onPress: () => router.back(),
          },
          {
            text: t('confirm_modal.btn_cancel'),
            style: 'cancel',
          },
        ]
      );
    } else {
      Alert.alert(
        t('confirm_modal.cannot_save_draft_title'),
        t('editor_component.alert_required_fields'),
        [
          {
            text: t('confirm_modal.btn_discard_changes'),
            style: 'destructive',
            onPress: () => router.back(),
          },
          {
            text: t('confirm_modal.btn_continue_editing'),
            style: 'cancel',
          },
        ]
      );
    }
  };

  if (isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  return (
    <MessageComposer
      ref={messageComposerRef}
      initialData={initialData}
      sendingMethod={params.sendingMethod || 'cronpost_email'}
      buttonSet="scm"
      onAction={handleScmAction}
      onCancel={handleCancel}
    />
  );
}