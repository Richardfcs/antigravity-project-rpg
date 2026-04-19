"use client";

import { useEffect } from "react";

import { SESSION_MESSAGE_WINDOW } from "@/lib/chat/window";
import { subscribeToSlice } from "@/lib/realtime/subscribe";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useChatStore } from "@/stores/chat-store";
import type { SessionMessageKind, SessionMessageRecord } from "@/types/message";

interface MessageRowPayload {
  id: string;
  session_id: string;
  participant_id: string | null;
  display_name: string;
  kind: SessionMessageKind;
  body: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface UseSessionChatOptions {
  sessionId: string;
  initialMessages: SessionMessageRecord[];
  enabled?: boolean;
}

function mapMessagePayload(row: MessageRowPayload): SessionMessageRecord {
  return {
    id: row.id,
    sessionId: row.session_id,
    participantId: row.participant_id,
    displayName: row.display_name,
    kind: row.kind,
    body: row.body,
    payload: row.payload ?? {},
    createdAt: row.created_at
  };
}

export function useSessionChat({
  sessionId,
  initialMessages,
  enabled = true
}: UseSessionChatOptions) {
  const setMessages = useChatStore((state) => state.setMessages);
  const upsertMessage = useChatStore((state) => state.upsertMessage);
  const removeMessage = useChatStore((state) => state.removeMessage);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, setMessages]);

  useEffect(() => {
    if (!enabled || !sessionId) {
      return;
    }

    let client;

    try {
      client = createBrowserSupabaseClient();
    } catch {
      return;
    }

    return subscribeToSlice({
      client,
      channelName: `session-chat:${sessionId}`,
      pollMs: 5000,
      maxPollMs: 12000,
      reconcile: async () => {
        const { data, error } = await client
          .from("session_messages")
          .select("id,session_id,participant_id,display_name,kind,body,payload,created_at")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(SESSION_MESSAGE_WINDOW);

        if (!error && data) {
          setMessages((data as MessageRowPayload[]).map(mapMessagePayload).reverse());
        }
      },
      register: (channel) =>
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "session_messages",
            filter: `session_id=eq.${sessionId}`
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              if (payload.old && typeof payload.old.id === "string") {
                removeMessage(payload.old.id);
              }

              return;
            }

            if (payload.new) {
              upsertMessage(mapMessagePayload(payload.new as MessageRowPayload));
            }
          }
        )
    });
  }, [enabled, removeMessage, sessionId, setMessages, upsertMessage]);
}
