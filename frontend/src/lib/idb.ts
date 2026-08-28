/**
 * Local-first storage primitive: a tiny promise wrapper over IndexedDB.
 * This is the only module that knows IndexedDB exists — everything above it
 * talks to the repository interface in lib/repo.ts, so a future BYODB /
 * Postgres adapter can replace this file without touching UI code.
 */
const DB_NAME = "notevoro";
const DB_VERSION = 2;

export const STORES = [
  "users",
  "spaces",
  "tasks",
  "events",
  "knowledge",
  "conversations",
  "messages",
  "settings",
  // The virtual vault: one record per Markdown file, keyed by its relative path.
  "files",
] as const;

export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
  return dbPromise;
}

async function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  action: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = action(tx.objectStore(store));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export function put<T extends { id: string }>(store: StoreName, value: T): Promise<IDBValidKey> {
  return run(store, "readwrite", (s) => s.put(value));
}

export function get<T>(store: StoreName, id: string): Promise<T | undefined> {
  return run(store, "readonly", (s) => s.get(id));
}

export function all<T>(store: StoreName): Promise<T[]> {
  return run<T[]>(store, "readonly", (s) => s.getAll()).then((rows) => rows ?? []);
}

export function remove(store: StoreName, id: string): Promise<undefined> {
  return run(store, "readwrite", (s) => s.delete(id));
}

export async function clearAll(): Promise<void> {
  for (const store of STORES) {
    await run(store, "readwrite", (s) => s.clear());
  }
}

export const newId = (): string => crypto.randomUUID();
