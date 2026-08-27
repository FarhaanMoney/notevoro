export type TemplateId = "student" | "educator" | "professional" | "blank";
export type Role = "owner" | "editor" | "viewer";

/** Mirrors backend Profile */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  created_at?: string;
}

/**
 * Spaces are collaborative (membership, roles, invitations), so they are owned by the
 * server. `role` is the signed-in user's role on this Space.
 */
export interface Space {
  id: string;
  ownerId: string;
  name: string;
  templateId: TemplateId;
  icon: string;
  color: string;
  modules: string[];
  createdAt: string;
  role: Role;
}

/** Mirrors backend SpaceMember */
export interface SpaceMember {
  space_id: string;
  user_id: string;
  email: string;
  name: string;
  role: Role;
  joined_at: string;
}

/** Mirrors backend Invitation */
export interface Invitation {
  id: string;
  space_id: string;
  space_name: string;
  email: string | null;
  code: string;
  role: Role;
  status: "pending" | "accepted" | "declined";
  invited_by_id: string;
  invited_by_name: string;
  created_at: string;
}

/** Mirrors backend Conversation (messaging between people — not Voro chats) */
export interface MessageThread {
  id: string;
  kind: "direct" | "space";
  space_id: string | null;
  title: string;
  participant_ids: string[];
  participant_names: string[];
  created_at: string;
  updated_at: string;
  last_message: string;
  unread: number;
}

/** Mirrors backend Message */
export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  mention_ids: string[];
  read_by: string[];
  created_at: string;
}

/** Mirrors backend MentionOut */
export interface Mention {
  message: DirectMessage;
  conversation_title: string;
}

/** Mirrors backend Activity */
export interface ActivityItem {
  id: string;
  user_id: string;
  kind: string;
  text: string;
  created_at: string;
}

/** Mirrors backend InboxCounts */
export interface InboxCounts {
  messages: number;
  mentions: number;
  invitations: number;
  activity: number;
  total: number;
}

/** Mirrors backend MessageOut */
export interface ApiMessage {
  message: string;
}

/* ------------------------- local-first personal workspace ------------------------- */

export type TaskStatus = "open" | "done";
export type Priority = "low" | "medium" | "high";

export interface Task {
  id: string;
  userId: string;
  spaceId: string | null;
  title: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  module: string | null;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  spaceId: string | null;
  title: string;
  date: string;
  time: string;
  location: string;
  createdAt: string;
}

export type KnowledgeKind = "note" | "document" | "webclip" | "media";

export interface KnowledgeItem {
  id: string;
  userId: string;
  spaceId: string | null;
  title: string;
  kind: KnowledgeKind;
  body: string;
  tags: string[];
  folder: string;
  updatedAt: string;
  createdAt: string;
}

/** Voro AI conversation (local-first, never leaves the browser except as prompt text) */
export interface Conversation {
  id: string;
  userId: string;
  spaceId: string | null;
  title: string;
  updatedAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Settings {
  id: string;
  userId: string;
  theme: "light" | "dark" | "system";
  reducedMotion: boolean;
}

/** Mirrors backend/models/voro.py ProviderStatus */
export interface ProviderStatus {
  configured: boolean;
  provider: string;
  model: string | null;
  message: string;
}

/** Mirrors backend/models/voro.py ChatResponse */
export interface ChatResponse {
  content: string;
  model: string;
}
