import { all, put, remove, newId } from "@/lib/idb";
import { vault } from "@/lib/vault";
import {
  fmNullableString,
  fmString,
  fmStringArray,
  parseNote,
  stringifyNote,
} from "@/lib/vault/markdown";
import type { Frontmatter } from "@/lib/vault/markdown";
import type {
  CalendarEvent,
  ChatMessage,
  Conversation,
  KnowledgeItem,
  KnowledgeKind,
  Priority,
  Task,
} from "@/types";

/**
 * Domain repository layer.
 *
 * The UI calls these functions and nothing else. Underneath, every task, event and
 * Knowledge item is a Markdown file with YAML frontmatter in the user's vault, laid out as:
 *
 *   personal/tasks/<id>.md
 *   personal/knowledge/<id>.md
 *   personal/calendar/<id>.md
 *   spaces/<spaceId>/tasks/<id>.md
 *   spaces/<spaceId>/knowledge/<id>.md
 *   spaces/<spaceId>/calendar/<id>.md
 *
 * Swapping the browser adapter for the Tauri adapter changes where those files live and
 * nothing else — no UI, no query keys, no signatures.
 *
 * `userId` is retained in these signatures so a vault can later carry multiple profiles;
 * a vault is single-user, so it is recorded in frontmatter rather than used for filtering.
 */

const iso = () => new Date().toISOString();

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

type Collection = "tasks" | "calendar" | "knowledge";

const scopeOf = (spaceId: string | null): string =>
  spaceId ? `spaces/${spaceId}` : "personal";

const pathOf = (collection: Collection, spaceId: string | null, id: string): string =>
  `${scopeOf(spaceId)}/${collection}/${id}.md`;

/** Roots to scan: a single Space, or everything. */
const rootsFor = (spaceId: string | null | undefined): string[] =>
  spaceId ? [`spaces/${spaceId}`] : ["personal", "spaces"];

async function readCollection(
  collection: Collection,
  spaceId: string | null | undefined,
): Promise<{ path: string; raw: string }[]> {
  const adapter = vault();
  const out: { path: string; raw: string }[] = [];
  for (const root of rootsFor(spaceId)) {
    const paths = (await adapter.list(root)).filter((p) =>
      p.includes(`/${collection}/`) && p.endsWith(".md"),
    );
    for (const path of paths) {
      const raw = await adapter.read(path);
      if (raw !== null) out.push({ path, raw });
    }
  }
  return out;
}

async function findPath(collection: Collection, id: string): Promise<string | null> {
  const adapter = vault();
  for (const root of ["personal", "spaces"]) {
    const hit = (await adapter.list(root)).find(
      (p) => p.includes(`/${collection}/`) && p.endsWith(`/${id}.md`),
    );
    if (hit) return hit;
  }
  return null;
}

const spaceIdFromPath = (path: string): string | null =>
  path.startsWith("spaces/") ? path.split("/")[1] : null;

/* ---------------------------------- tasks ---------------------------------- */

const taskToNote = (t: Task): string =>
  stringifyNote(
    {
      id: t.id,
      type: "task",
      owner: t.userId,
      space: t.spaceId,
      title: t.title,
      status: t.status,
      priority: t.priority,
      due: t.dueDate,
      module: t.module,
      created: t.createdAt,
    } satisfies Frontmatter,
    "",
  );

const noteToTask = (path: string, raw: string): Task => {
  const { frontmatter: fm } = parseNote(raw);
  return {
    id: fmString(fm, "id", path.split("/").pop()!.replace(/\.md$/, "")),
    userId: fmString(fm, "owner"),
    spaceId: fmNullableString(fm, "space") ?? spaceIdFromPath(path),
    title: fmString(fm, "title", "Untitled task"),
    status: fmString(fm, "status", "open") === "done" ? "done" : "open",
    priority: (["low", "medium", "high"].includes(fmString(fm, "priority"))
      ? fmString(fm, "priority")
      : "medium") as Priority,
    dueDate: fmNullableString(fm, "due"),
    module: fmNullableString(fm, "module"),
    createdAt: fmString(fm, "created", iso()),
  };
};

export async function listTasks(_userId: string, spaceId?: string | null): Promise<Task[]> {
  const rows = await readCollection("tasks", spaceId);
  return rows
    .map(({ path, raw }) => noteToTask(path, raw))
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
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
  await vault().write(pathOf("tasks", task.spaceId, task.id), taskToNote(task));
  return task;
}

export async function updateTask(task: Task): Promise<Task> {
  await vault().write(pathOf("tasks", task.spaceId, task.id), taskToNote(task));
  return task;
}

export async function deleteTask(id: string): Promise<void> {
  const path = await findPath("tasks", id);
  if (path) await vault().remove(path);
}

/* ---------------------------------- events --------------------------------- */

const eventToNote = (e: CalendarEvent): string =>
  stringifyNote(
    {
      id: e.id,
      type: "event",
      owner: e.userId,
      space: e.spaceId,
      title: e.title,
      date: e.date,
      time: e.time,
      location: e.location,
      created: e.createdAt,
    } satisfies Frontmatter,
    "",
  );

const noteToEvent = (path: string, raw: string): CalendarEvent => {
  const { frontmatter: fm } = parseNote(raw);
  return {
    id: fmString(fm, "id", path.split("/").pop()!.replace(/\.md$/, "")),
    userId: fmString(fm, "owner"),
    spaceId: fmNullableString(fm, "space") ?? spaceIdFromPath(path),
    title: fmString(fm, "title", "Untitled event"),
    date: fmString(fm, "date", todayIso()),
    time: fmString(fm, "time", "09:00"),
    location: fmString(fm, "location"),
    createdAt: fmString(fm, "created", iso()),
  };
};

export async function listEvents(
  _userId: string,
  spaceId?: string | null,
): Promise<CalendarEvent[]> {
  const rows = await readCollection("calendar", spaceId);
  return rows
    .map(({ path, raw }) => noteToEvent(path, raw))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
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
  await vault().write(pathOf("calendar", event.spaceId, event.id), eventToNote(event));
  return event;
}

export async function updateEvent(event: CalendarEvent): Promise<CalendarEvent> {
  await vault().write(pathOf("calendar", event.spaceId, event.id), eventToNote(event));
  return event;
}

export async function deleteEvent(id: string): Promise<void> {
  const path = await findPath("calendar", id);
  if (path) await vault().remove(path);
}

/* --------------------------------- knowledge -------------------------------- */

/** Knowledge items keep their prose as the Markdown body — this is the readable note. */
const knowledgeToNote = (k: KnowledgeItem): string =>
  stringifyNote(
    {
      id: k.id,
      type: "knowledge",
      owner: k.userId,
      space: k.spaceId,
      title: k.title,
      kind: k.kind,
      folder: k.folder,
      tags: k.tags,
      created: k.createdAt,
      updated: k.updatedAt,
    } satisfies Frontmatter,
    k.body,
  );

const noteToKnowledge = (path: string, raw: string): KnowledgeItem => {
  const { frontmatter: fm, body } = parseNote(raw);
  const kind = fmString(fm, "kind", "note");
  return {
    id: fmString(fm, "id", path.split("/").pop()!.replace(/\.md$/, "")),
    userId: fmString(fm, "owner"),
    spaceId: fmNullableString(fm, "space") ?? spaceIdFromPath(path),
    title: fmString(fm, "title", "Untitled"),
    kind: (["note", "document", "webclip", "media"].includes(kind)
      ? kind
      : "note") as KnowledgeKind,
    body,
    tags: fmStringArray(fm, "tags"),
    folder: fmString(fm, "folder", "Unsorted"),
    createdAt: fmString(fm, "created", iso()),
    updatedAt: fmString(fm, "updated", iso()),
  };
};

export async function listKnowledge(
  _userId: string,
  spaceId?: string | null,
): Promise<KnowledgeItem[]> {
  const rows = await readCollection("knowledge", spaceId);
  return rows
    .map(({ path, raw }) => noteToKnowledge(path, raw))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createKnowledge(input: {
  userId: string;
  spaceId: string | null;
  title: string;
  kind: KnowledgeKind;
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
    folder: input.folder?.trim() || "Unsorted",
    createdAt: now,
    updatedAt: now,
  };
  await vault().write(pathOf("knowledge", item.spaceId, item.id), knowledgeToNote(item));
  return item;
}

export async function updateKnowledge(item: KnowledgeItem): Promise<KnowledgeItem> {
  const next = { ...item, updatedAt: iso() };
  await vault().write(pathOf("knowledge", next.spaceId, next.id), knowledgeToNote(next));
  return next;
}

export async function deleteKnowledge(id: string): Promise<void> {
  const path = await findPath("knowledge", id);
  if (path) await vault().remove(path);
}

/* ------------------------------- space cleanup ------------------------------ */

export async function purgeSpaceData(_userId: string, spaceId: string): Promise<void> {
  const adapter = vault();
  for (const path of await adapter.list(`spaces/${spaceId}`)) {
    await adapter.remove(path);
  }
}

/* ------------------------------- Voro AI chats ------------------------------ */
/* App state rather than user documents, so these stay in the local key-value store.  */

const mine = <T extends { userId: string }>(rows: T[], userId: string) =>
  rows.filter((r) => r.userId === userId);

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
  const conversation: Conversation = {
    id: newId(),
    userId,
    spaceId,
    title,
    createdAt: now,
    updatedAt: now,
  };
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
  const message: ChatMessage = {
    id: newId(),
    userId,
    conversationId,
    role,
    content,
    createdAt: iso(),
  };
  await put("messages", message);
  await put("conversations", {
    ...(await all<Conversation>("conversations")).find((c) => c.id === conversationId)!,
    updatedAt: iso(),
  });
  return message;
}

/* --------------------------------- portability ------------------------------ */

/** Every file in the vault, ready to be written to disk as a real folder. */
export async function exportVaultFiles(): Promise<Record<string, string>> {
  const adapter = vault();
  const files: Record<string, string> = {};
  for (const root of ["personal", "spaces"]) {
    for (const path of await adapter.list(root)) {
      files[path] = (await adapter.read(path)) ?? "";
    }
  }
  return files;
}

export async function exportAll(userId: string) {
  return {
    exportedAt: iso(),
    vault: await exportVaultFiles(),
    voroConversations: mine(await all<Conversation>("conversations"), userId),
    voroMessages: mine(await all<ChatMessage>("messages"), userId),
  };
}

/* --------------------------------- migration -------------------------------- */

const MIGRATION_KEY = "notevoro.vaultMigrated.v1";

/**
 * One-time move of pre-vault records (which lived in dedicated IndexedDB stores) into
 * Markdown files. Runs once per browser and is idempotent.
 */
export async function migrateLegacyDataToVault(userId: string): Promise<number> {
  if (localStorage.getItem(MIGRATION_KEY)) return 0;
  let moved = 0;
  try {
    for (const t of mine(await all<Task>("tasks"), userId)) {
      await vault().write(pathOf("tasks", t.spaceId, t.id), taskToNote(t));
      moved++;
    }
    for (const e of mine(await all<CalendarEvent>("events"), userId)) {
      await vault().write(pathOf("calendar", e.spaceId, e.id), eventToNote(e));
      moved++;
    }
    for (const k of mine(await all<KnowledgeItem>("knowledge"), userId)) {
      await vault().write(pathOf("knowledge", k.spaceId, k.id), knowledgeToNote(k));
      moved++;
    }
  } finally {
    localStorage.setItem(MIGRATION_KEY, "1");
  }
  return moved;
}
