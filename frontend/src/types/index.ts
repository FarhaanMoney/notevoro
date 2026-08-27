export type TemplateId = "student" | "educator" | "professional" | "blank";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface Space {
  id: string;
  userId: string;
  name: string;
  templateId: TemplateId;
  icon: string;
  color: string;
  modules: string[];
  createdAt: string;
}

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
