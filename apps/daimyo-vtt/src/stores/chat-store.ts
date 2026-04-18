"use client";

import { create } from "zustand";

import type { SessionMessageRecord } from "@/types/message";

function sortMessages(messages: SessionMessageRecord[]) {
  return [...messages].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

interface ChatState {
  messages: SessionMessageRecord[];
  setMessages: (messages: SessionMessageRecord[]) => void;
  upsertMessage: (message: SessionMessageRecord) => void;
  removeMessage: (messageId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  setMessages: (messages) => set({ messages: sortMessages(messages) }),
  upsertMessage: (message) =>
    set((state) => ({
      messages: sortMessages([
        ...state.messages.filter((item) => item.id !== message.id),
        message
      ])
    })),
  removeMessage: (messageId) =>
    set((state) => ({
      messages: state.messages.filter((message) => message.id !== messageId)
    }))
}));
