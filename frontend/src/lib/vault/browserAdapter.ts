import { all, put, remove } from "@/lib/idb";
import type { VaultAdapter, VaultInfo, DirectoryInfo, VaultStats } from "@/lib/vault/types";

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

  async listDirs(dir: string): Promise<DirectoryInfo[]> {
    const prefix = dir.endsWith("/") || dir === "" ? dir : `${dir}/`;
    const rows = await all<VaultFile>("files");
    const paths = rows.map((r) => r.id).filter((p) => p.startsWith(prefix));
    
    // Extract unique directory names
    const dirs = new Set<string>();
    const files = new Set<string>();
    
    for (const path of paths) {
      const relativePath = path.slice(prefix.length);
      const parts = relativePath.split('/');
      
      if (parts.length > 1) {
        // It's in a subdirectory
        dirs.add(parts[0]);
      } else {
        // It's a file in the current directory
        files.add(parts[0]);
      }
    }
    
    const result: DirectoryInfo[] = [];
    
    // Add directories first
    for (const dir of Array.from(dirs).sort()) {
      result.push({
        name: dir,
        path: `${prefix}${dir}`,
        is_file: false,
      });
    }
    
    // Add files
    for (const file of Array.from(files).sort()) {
      result.push({
        name: file,
        path: `${prefix}${file}`,
        is_file: true,
      });
    }
    
    return result;
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

  async createFolder(path: string): Promise<void> {
    // In browser adapter, folders are virtual - we create a placeholder file
    await put<VaultFile>("files", { 
      id: `${path}/.gitkeep`, 
      content: "", 
      updatedAt: new Date().toISOString() 
    });
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const rows = await all<VaultFile>("files");
    const file = rows.find((r) => r.id === oldPath);
    if (file) {
      await remove("files", oldPath);
      await put<VaultFile>("files", { 
        ...file, 
        id: newPath, 
        updatedAt: new Date().toISOString() 
      });
    }
  }

  async createVault(name: string): Promise<VaultInfo> {
    // Create standard structure in the virtual vault
    const standardFiles = [
      "Spaces/.gitkeep",
      "Knowledge/.gitkeep", 
      "Tasks/.gitkeep",
      "Calendar/.gitkeep",
      "Documents/.gitkeep",
      "Voro/.gitkeep",
      "Inbox/.gitkeep",
      "personal/.gitkeep",
      "personal/tasks/.gitkeep",
      "personal/knowledge/.gitkeep",
      "personal/calendar/.gitkeep",
    ];
    
    for (const path of standardFiles) {
      await put<VaultFile>("files", { 
        id: path, 
        content: "", 
        updatedAt: new Date().toISOString() 
      });
    }
    
    return this.info();
  }

  async watch(): Promise<() => void> {
    // No external process can edit a virtual vault, so there is nothing to watch.
    return () => {};
  }

  async search(query: string): Promise<any[]> {
    const rows = await all<VaultFile>("files");
    const results: any[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const row of rows) {
      if (row.content.toLowerCase().includes(lowerQuery) || 
          row.id.toLowerCase().includes(lowerQuery)) {
        results.push({
          path: row.id,
          title: row.id.split('/').pop() || row.id,
          snippet: row.content.slice(0, 240),
        });
      }
    }
    
    return results.slice(0, 50);
  }

  async reindex(): Promise<number> {
    const rows = await all<VaultFile>("files");
    return rows.length;
  }

  async getStats(): Promise<VaultStats> {
    const rows = await all<VaultFile>("files");
    const markdownFiles = rows.filter(r => r.id.endsWith('.md')).length;
    
    // Extract spaces from paths
    const spaces = new Set<string>();
    for (const row of rows) {
      const match = row.id.match(/^spaces\/([^\/]+)/);
      if (match) {
        spaces.add(match[1]);
      }
    }
    
    return {
      total_files: rows.length,
      markdown_files: markdownFiles,
      spaces: Array.from(spaces),
      knowledge_count: rows.filter(r => r.id.includes('/knowledge/')).length,
      task_count: rows.filter(r => r.id.includes('/tasks/')).length,
      event_count: rows.filter(r => r.id.includes('/calendar/')).length,
    };
  }
}
