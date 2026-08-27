import { apiGet, apiPost } from "@/lib/api";
import type { ApiMessage, DirectMessage, InboxCounts, Mention, MessageThread } from "@/types";

export const listThreads = () => apiGet<MessageThread[]>("/conversations");

export const startDirectThread = (email: string) =>
  apiPost<MessageThread>("/conversations", { kind: "direct", email });

export const startSpaceThread = (spaceId: string) =>
  apiPost<MessageThread>("/conversations", { kind: "space", space_id: spaceId });

export const listThreadMessages = (threadId: string) =>
  apiGet<DirectMessage[]>(`/conversations/${threadId}/messages`);

export const sendThreadMessage = (threadId: string, body: string) =>
  apiPost<DirectMessage>(`/conversations/${threadId}/messages`, { body });

export const markThreadRead = (threadId: string) =>
  apiPost<ApiMessage>(`/conversations/${threadId}/read`);

export const listMentions = () => apiGet<Mention[]>("/mentions");

export const inboxCounts = () => apiGet<InboxCounts>("/inbox/counts");
