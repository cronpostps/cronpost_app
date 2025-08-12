// app/(main)/scm/compose.tsx
// Version: 2.1.1

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
  const [currentSendingMethod, setCurrentSendingMethod] = useState(params.sendingMethod);

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
        setCurrentSendingMethod(scmData.sending_method);
        const composerData: Partial<MessageData> = {
          recipients: scmData.receiver_addresses.map((r: { email: string }) => r.email),
          subject: scmData.title,
          content: scmData.content,
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
    try {
      if (action === 'save_draft') {
        if (params.scmId) {
          // Cập nhật bản nháp đã có (PUT)
          // Payload tuân theo SCMUpdateRequest
          const updatePayload = {
            message: {
              title: data.subject,
              content: data.content,
              receiver_addresses: data.recipients,
              attachment_file_ids: data.attachments.map(f => f.id),
            }
          };
          await api.put(`/api/scm/${params.scmId}`, updatePayload);
        } else {
          // Tạo bản nháp mới (POST)
          // Payload tuân theo SCMCreateRequest
          const createPayload = {
            message: {
              sending_method: params.sendingMethod,
              receiver_addresses: data.recipients,
              title: data.subject,
              content: data.content,
              attachment_file_ids: data.attachments.map(f => f.id),
            },
            is_draft: true, // Đánh dấu đây là bản nháp
          };
          await api.post('/api/scm/', createPayload);
        }
        // Thêm khóa dịch thuật cho thông báo thành công
        Toast.show({ type: 'success', text2: t('scm_page.draft_save_success') });
        router.back();
      } else if (action === 'schedule') {
        // Xử lý schedule ở đây trong tương lai
      }
    } catch (error) {
      Alert.alert(t('errors.title_error'), translateApiError(error));
      throw error; // Ném lỗi ra để các component khác có thể bắt (nếu cần)
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

  const handleNavigateToSchedule = (data: MessageData) => {
    // Kiểm tra các trường bắt buộc trước khi điều hướng
    if (data.recipients.length === 0 || !data.content.trim()) {
      Toast.show({
        type: 'error',
        text1: t('errors.title_error'),
        text2: t('editor_component.alert_required_fields'),
      });
      return;
    }
    
    router.push({
      pathname: '/(main)/scm/schedule',
      params: {
        scmId: params.scmId,
        recipients: JSON.stringify(data.recipients),
        subject: data.subject,
        content: data.content,
        attachments: JSON.stringify(data.attachments),
        sendingMethod: currentSendingMethod,
        fromComposer: 'true', // <--- THÊM CỜ NÀY
      },
    });
  };

  if (isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  return (
    <MessageComposer
      ref={messageComposerRef}
      initialData={initialData}
      sendingMethod={currentSendingMethod || 'cronpost_email'}
      buttonSet="scm"
      onAction={handleScmAction}
      onCancel={handleCancel}
      onNavigateToSchedule={handleNavigateToSchedule}
    />
  );
}