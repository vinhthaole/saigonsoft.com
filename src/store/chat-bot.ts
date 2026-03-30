'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StoreChatMessage } from '@/ai/flows/storefront-chat';

interface ChatBotState {
  isOpen: boolean;
  messages: StoreChatMessage[];
  hasInitialized: boolean;
  
  setIsOpen: (isOpen: boolean) => void;
  addMessage: (msg: StoreChatMessage) => void;
  setMessages: (messages: StoreChatMessage[]) => void;
  clearSession: () => void;
  setHasInitialized: (val: boolean) => void;
}

export const useChatBotStore = create<ChatBotState>()(
  persist(
    (set) => ({
      isOpen: false,
      messages: [],
      hasInitialized: false,

      setIsOpen: (isOpen) => set({ isOpen }),
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      setMessages: (messages) => set({ messages }),
      setHasInitialized: (val) => set({ hasInitialized: val }),
      clearSession: () => set({
          messages: [],
          hasInitialized: false,
      }),
    }),
    {
      name: 'saigonsoft-chat-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
