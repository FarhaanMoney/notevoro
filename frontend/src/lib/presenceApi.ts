import { apiGet, apiPost } from "@/lib/api";
import type { ApiMessage } from "@/types";

/** Mirrors backend PresenceUser */
export interface PresenceUser {
  user_id: string;
  name: string;
  online: boolean;
  typing: boolean;
  last_seen: string;
}

/** Mirrors backend PresenceOut */
export interface PresenceOut {
  online_user_ids: string[];
  typing: PresenceUser[];
  users: PresenceUser[];
}

export const sendHeartbeat = (conversationId: string | null, typing: boolean) =>
  apiPost<ApiMessage>("/presence/heartbeat", {
    conversation_id: conversationId,
    typing,
  });

export const getConversationPresence = (conversationId: string) =>
  apiGet<PresenceOut>(`/presence?conversation_id=${encodeURIComponent(conversationId)}`);

export const getSpacePresence = (spaceId: string) =>
  apiGet<PresenceOut>(`/presence?space_id=${encodeURIComponent(spaceId)}`);
