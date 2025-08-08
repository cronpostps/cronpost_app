// src/store/iamStore.ts
// Version: 2.0.0 (Added client-side read tracking)

import { create } from 'zustand';
import api from '../api/api';
import i18n from '../locales/i18n';

interface IamState {
  unreadCount: number;
  isLoadingUnread: boolean;
  error: string | null;
  readMessageIds: Set<string>; // <-- Mới: Set để lưu ID các tin đã đọc
  fetchUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
  markAsRead: (messageId: string) => void; // <-- Mới: Action để đánh dấu đã đọc
}

export const useIamStore = create<IamState>((set) => ({
  unreadCount: 0,
  isLoadingUnread: false,
  error: null,
  readMessageIds: new Set(),

  setUnreadCount: (count: number) => set({ unreadCount: count }),

  markAsRead: (messageId: string) =>
    set((state) => ({
      readMessageIds: new Set(state.readMessageIds).add(messageId),
    })),

  fetchUnreadCount: async () => {
    set({ isLoadingUnread: true, error: null });
    try {
      const response = await api.get('/api/messaging/unread-count');
      set({
        unreadCount: response.data.unread_count || 0,
        isLoadingUnread: false,
      });
    } catch (err) {
      console.error('Failed to fetch IAM unread count:', err);
      set({ error: i18n.t('errors.fetch_unread_failed'), isLoadingUnread: false });
    }
  },
}));