// app/(main)/iam/compose.tsx
// Version: 4.0.0 (Refactored)

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

import api from '../../../src/api/api';
import MessageComposer, { ActionType, MessageData } from '../../../src/components/MessageComposer';
import { translateApiError } from '../../../src/utils/errorTranslator';

export default function IamComposeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ recipients?: string, subject?: string, content?: string }>();

  // Prepare initial data from navigation parameters
  const initialData = {
    recipients: params.recipients ? params.recipients.split(/[ ,]+/).filter(Boolean) : [],
    subject: params.subject,
    content: params.content,
  };

  const handleSendMessage = async (action: ActionType, data: MessageData) => {
    // This screen only handles the 'send' action for IAM.
    if (action !== 'send') {
      return;
    }

    try {
      const payload = {
        receiver_emails: data.recipients,
        subject: data.subject,
        content: data.content,
        attachment_file_ids: data.attachments.map((f: { id: string }) => f.id),
      };

      // Using the CORRECT endpoint as you instructed.
      await api.post('/api/messaging/send', payload);
      
      Toast.show({ type: 'success', text2: t('iam_page.send_success_message') });
      router.back();
    } catch (error) {
      Alert.alert(t('errors.title_error'), translateApiError(error));
      // Re-throw the error to let the composer know the action failed
      throw error;
    }
  };

  return (
    <MessageComposer
      initialData={initialData}
      sendingMethod="in_app_messaging"
      buttonSet="iam"
      onAction={handleSendMessage}
      onCancel={() => router.back()}
    />
  );
}