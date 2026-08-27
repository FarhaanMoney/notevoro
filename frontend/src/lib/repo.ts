import { all, put, remove, newId } from "@/lib/idb";
import type {
  CalendarEvent,
  ChatMessage,
  Conversation,
  KnowledgeItem,
  Priority,
  Task,
} from "@/types";

/**
 * Repository layer. The UI never touches a storage engine directly — every
 * read/write is scoped by userId (and spaceId where relevant), which is what
 * enforces both per-user and per-Space data isolation.
 */
const iso = () => new Date().toISOString();

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

const mine = <T extends { userId: string }>(rows: T[], userId: string) =>
  rows.filter((r) => r.userId === userId);

/* ------------------------------- space cleanup ------------------------------ */

/**
 * Spaces themselves live on the server (membership/roles), but their personal content
 * is local — so deleting or leaving a Space must also purge the local rows.
 */
export async function purgeSpaceData(userId: string, spaceId: string): Promise<void> {
  for (const t of mine(await all<Task>("tasks"), userId)) {
    if (t.spaceId === spaceId) await remove("tasks", t.id);
  }
  for (const e of mine(await all<CalendarEvent>("events"), userId)) {
    if (e.spaceId === spaceId) await remove("events", e.id);
  }
  for (const k of mine(await all<KnowledgeItem>("knowledge"), userId)) {
    if (k.spaceId === spaceId) await remove("knowledge", k.id);
  }
}

/* ---------------------------------- tasks ---------------------------------- */

export async function listTasks(userId: string, spaceId?: string | null): Promise<Task[]> {
  const rows = mine(await all<Task>("tasks"), userId);
  const scoped = spaceId ? rows.filter((t) => t.spaceId === spaceId) : rows;
  return scoped.sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
}

export async function createTask(input: {
  userId: string;
  spaceId: string | null;
  title: string;
  priority?: Priority;
  dueDate?: string | null;
  module?: string | null;
}): Promise<Task> {
  const task: Task = {
    id: newId(),
    userId: input.userId,
    spaceId: input.spaceId,
    title: input.title.trim(),
    status: "open",
    priority: input.priority ?? "medium",
    dueDate: input.dueDate ?? null,
    module: input.module ?? null,
    createdAt: iso(),
  };
  await put("tasks", task);
  return task;
}

export async function updateTask(task: Task): Promise<Task> {
  await put("tasks", task);
  return task;
}

export const deleteTask = (id: string) => remove("tasks", id);

/* ---------------------------------- events --------------------------------- */

export async function listEvents(
  userId: string,
  spaceId?: string | null,
): Promise<CalendarEvent[]> {
  const rows = mine(await all<CalendarEvent>("events"), userId);
  const scoped = spaceId ? rows.filter((e) => e.spaceId === spaceId) : rows;
  return scoped.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

export async function createEvent(input: {
  userId: string;
  spaceId: string | null;
  title: string;
  date: string;
  time: string;
  location?: string;
}): Promise<CalendarEvent> {
  const event: CalendarEvent = {
    id: newId(),
    userId: input.userId,
    spaceId: input.spaceId,
    title: input.title.trim(),
    date: input.date,
    time: input.time,
    location: input.location?.trim() ?? "",
    createdAt: iso(),
  };
  await put("events", event);
  return event;
}

export async function updateEvent(event: CalendarEvent): Promise<CalendarEvent> {
  await put("events", event);
  return event;
}

export const deleteEvent = (id: string) => remove("events", id);

/* --------------------------------- knowledge -------------------------------- */

export async function listKnowledge(
  userId: string,
  spaceId?: string | null,
): Promise<KnowledgeItem[]> {
  const rows = mine(await all<KnowledgeItem>("knowledge"), userId);
  const scoped = spaceId ? rows.filter((k) => k.spaceId === spaceId) : rows;
  return scoped.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createKnowledge(input: {
  userId: string;
  spaceId: string | null;
  title: string;
  kind: KnowledgeItem["kind"];
  body?: string;
  tags?: string[];
  folder?: string;
}): Promise<KnowledgeItem> {
  const now = iso();
  const item: KnowledgeItem = {
    id: newId(),
    userId: input.userId,
    spaceId: input.spaceId,
    title: input.title.trim(),
    kind: input.kind,
    body: input.body ?? "",
    tags: input.tags ?? [],
    folder: input.folder ?? "Unsorted",
    createdAt: now,
    updatedAt: now,
  };
  await put("knowledge", item);
  return item;
}

export async function updateKnowledge(item: KnowledgeItem): Promise<KnowledgeItem> {
  const next = { ...item, updatedAt: iso() };
  await put("knowledge", next);
  return next;
}

export const deleteKnowledge = (id: string) => remove("knowledge", id);

/* ------------------------------- conversations ------------------------------ */

export async function listConversations(
  userId: string,
  spaceId?: string | null,
): Promise<Conversation[]> {
  const rows = mine(await all<Conversation>("conversations"), userId);
  const scoped = spaceId === undefined ? rows : rows.filter((c) => c.spaceId === spaceId);
  return scoped.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createConversation(
  userId: string,
  spaceId: string | null,
  title = "New conversation",
): Promise<Conversation> {
  const now = iso();
  const conversation: Conversation = { id: newId(), userId, spaceId, title, createdAt: now, updatedAt: now };
  await put("conversations", conversation);
  return conversation;
}

export async function renameConversation(c: Conversation, title: string): Promise<Conversation> {
  const next = { ...c, title, updatedAt: iso() };
  await put("conversations", next);
  return next;
}

export async function deleteConversation(userId: string, id: string): Promise<void> {
  await remove("conversations", id);
  for (const m of mine(await all<ChatMessage>("messages"), userId)) {
    if (m.conversationId === id) await remove("messages", m.id);
  }
}

export async function listMessages(userId: string, conversationId: string): Promise<ChatMessage[]> {
  return mine(await all<ChatMessage>("messages"), userId)
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addMessage(
  userId: string,
  conversationId: string,
  role: ChatMessage["role"],
  content: string,
): Promise<ChatMessage> {
  const message: ChatMessage = { id: newId(), userId, conversationId, role, content, createdAt: iso() };
  await put("messages", message);
  return message;
}

/* --------------------------------- portability ------------------------------ */

export async function exportAll(userId: string) {
  return {
    exportedAt: iso(),
    tasks: mine(await all<Task>("tasks"), userId),
    events: mine(await all<CalendarEvent>("events"), userId),
    knowledge: mine(await all<KnowledgeItem>("knowledge"), userId),
    conversations: mine(await all<Conversation>("conversations"), userId),
    messages: mine(await all<ChatMessage>("messages"), userId),
  };
}
