/**
 * Vault storage contract.
 *
 * This is the ONLY interface the application's data layer knows about. It is deliberately
 * a *file* API, not a database API, because the user's vault — Markdown files on their own
 * hard drive — is the source of truth.
 *
 *   React/TypeScript UI
 *        ↓
 *   domain repositories (lib/repo.ts)
 *        ↓
 *   VaultAdapter  ← this file
 *        ↓
 *   ┌──────────────────────────┬────────────────────────────────┐
 *   │ BrowserVaultAdapter      │ TauriVaultAdapter              │
 *   │ (web preview / dev)      │ Tauri 2 → Rust → real files    │
 *   │ virtual files in IDB     │ + SQLite index + fs watching   │
 *   └──────────────────────────┴────────────────────────────────┘
 *
 * Nothing above this line may assume which adapter is active.
 */

export interface VaultInfo {
  /** Which implementation is serving this vault. */
  kind: "browser" | "tauri";
  /** Human-readable label for Settings. */
  label: string;
  /** Vault location — a real filesystem path under Tauri, a virtual note in the browser. */
  path: string;
  /** False for read-only vaults (e.g. permission not yet granted). */
  writable: boolean;
  /** True when external file changes are detected and pushed back into the UI. */
  watching: boolean;
}

export interface DirectoryInfo {
  name: string;
  path: string;
  is_file: boolean;
}

export interface VaultStats {
  total_files: number;
  markdown_files: number;
  spaces: string[];
  knowledge_count: number;
  task_count: number;
  event_count: number;
}

export interface VaultAdapter {
  info(): Promise<VaultInfo>;
  /** Relative paths of every file under `dir` (recursive). */
  list(dir: string): Promise<string[]>;
  /** List directories and files in a specific directory (non-recursive). */
  listDirs?(dir: string): Promise<DirectoryInfo[]>;
  read(path: string): Promise<string | null>;
  write(path: string, content: string): Promise<void>;
  remove(path: string): Promise<void>;
  /** Create a folder in the vault. */
  createFolder(path: string): Promise<void>;
  /** Rename a file or folder in the vault. */
  rename?(oldPath: string, newPath: string): Promise<void>;
  /** Create a new vault with standard structure. */
  createVault?(name: string): Promise<VaultInfo>;
  /**
   * Subscribe to external changes. Returns an unsubscribe function. The browser adapter
   * is a no-op; the Tauri adapter wires this to Rust filesystem watching so editing a
   * note in Obsidian or VS Code updates Notevoro live.
   */
  watch(onChange: () => void): Promise<() => void>;
  /** Ask the user to choose a vault folder. Only meaningful under Tauri. */
  selectVault?(): Promise<VaultInfo | null>;
  /** Search the vault content. */
  search?(query: string): Promise<any[]>;
  /** Rebuild the SQLite index. */
  reindex?(): Promise<number>;
  /** Get vault statistics. */
  getStats?(): Promise<VaultStats>;
}
