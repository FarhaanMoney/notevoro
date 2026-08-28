import { all, put, remove } from "@/lib/idb";
import type { VaultAdapter, VaultInfo } from "@/lib/vault/types";

interface VaultFile {
  id: string; // the relative path, e.g. "spaces/<id>/tasks/<id>.md"
  content: string;
  updatedAt: string;
}

/**
 * Development / web-preview adapter.
 *
 * A browser cannot be given free access to a folder on the hard drive, so this keeps the
 * exact same Markdown files in IndexedDB as a *virtual* vault. The files, their paths and
 * their contents are byte-identical to what the Tauri adapter writes to disk, which is what
 * makes the migration a swap rather than a rewrite — and what makes "Export vault" produce
 * a folder the desktop app can open directly.
 */
export class BrowserVaultAdapter implements VaultAdapter {
  async info(): Promise<VaultInfo> {
    return {
      kind: "browser",
      label: "Browser vault (development)",
      path: "indexeddb://notevoro/files",
      writable: true,
      watching: false,
    };
  }

  async list(dir: string): Promise<string[]> {
    const prefix = dir.endsWith("/") || dir === "" ? dir : `${dir}/`;
    const rows = await all<VaultFile>("files");
    return rows.map((r) => r.id).filter((p) => p.startsWith(prefix));
  }

  async read(path: string): Promise<string | null> {
    const rows = await all<VaultFile>("files");
    return rows.find((r) => r.id === path)?.content ?? null;
  }

  async write(path: string, content: string): Promise<void> {
    await put<VaultFile>("files", { id: path, content, updatedAt: new Date().toISOString() });
  }

  async remove(path: string): Promise<void> {
    await remove("files", path);
  }

  async watch(): Promise<() => void> {
    // No external process can edit a virtual vault, so there is nothing to watch.
    return () => {};
  }
}
