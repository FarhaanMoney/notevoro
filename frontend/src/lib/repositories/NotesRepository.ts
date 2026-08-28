import { vault } from "@/lib/vault";
import type { KnowledgeItem } from "@/types";

/**
 * Notes Repository
 * 
 * Provides a clean abstraction for knowledge/notes operations.
 * Works with both browser and Tauri vault adapters transparently.
 */
export class NotesRepository {
  /**
   * Get all notes for a specific space or personal notes
   */
  async listNotes(userId: string, spaceId?: string | null): Promise<KnowledgeItem[]> {
    const adapter = vault();
    const scope = spaceId ? `spaces/${spaceId}` : "personal";
    const paths = (await adapter.list(scope)).filter(
      (p) => p.includes("/knowledge/") && p.endsWith(".md")
    );
    
    const notes: KnowledgeItem[] = [];
    for (const path of paths) {
      const content = await adapter.read(path);
      if (content) {
        notes.push(this.parseNote(path, content));
      }
    }
    
    return notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /**
   * Get a specific note by ID
   */
  async getNote(id: string): Promise<KnowledgeItem | null> {
    const adapter = vault();
    for (const scope of ["personal", "spaces"]) {
      const paths = await adapter.list(scope);
      const hit = paths.find((p) => p.includes("/knowledge/") && p.endsWith(`/${id}.md`));
      if (hit) {
        const content = await adapter.read(hit);
        if (content) {
          return this.parseNote(hit, content);
        }
      }
    }
    return null;
  }

  /**
   * Create a new note
   */
  async createNote(input: {
    userId: string;
    spaceId: string | null;
    title: string;
    kind: "note" | "document" | "webclip" | "media";
    body?: string;
    tags?: string[];
    folder?: string;
  }): Promise<KnowledgeItem> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    
    const note: KnowledgeItem = {
      id,
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
    
    const path = this.getNotePath(note.spaceId, note.id);
    const content = this.serializeNote(note);
    await vault().write(path, content);
    
    return note;
  }

  /**
   * Update an existing note
   */
  async updateNote(note: KnowledgeItem): Promise<KnowledgeItem> {
    const updated = { ...note, updatedAt: new Date().toISOString() };
    const path = this.getNotePath(updated.spaceId, updated.id);
    const content = this.serializeNote(updated);
    await vault().write(path, content);
    return updated;
  }

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<void> {
    const adapter = vault();
    for (const scope of ["personal", "spaces"]) {
      const paths = await adapter.list(scope);
      const hit = paths.find((p) => p.includes("/knowledge/") && p.endsWith(`/${id}.md`));
      if (hit) {
        await adapter.remove(hit);
        return;
      }
    }
  }

  /**
   * Search notes by content or title
   */
  async searchNotes(query: string): Promise<KnowledgeItem[]> {
    const adapter = vault();
    const results: KnowledgeItem[] = [];
    
    if ('search' in adapter && typeof adapter.search === 'function') {
      const searchResults = await adapter.search(query);
      for (const result of searchResults) {
        if (result.path.includes('/knowledge/')) {
          const content = await adapter.read(result.path);
          if (content) {
            results.push(this.parseNote(result.path, content));
          }
        }
      }
    } else {
      // Fallback: manually search all notes
      const allNotes = await this.listNotes("", null); // Get all notes
      const lowerQuery = query.toLowerCase();
      for (const note of allNotes) {
        if (note.title.toLowerCase().includes(lowerQuery) || 
            note.body.toLowerCase().includes(lowerQuery) ||
            note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
          results.push(note);
        }
      }
    }
    
    return results;
  }

  private getNotePath(spaceId: string | null, id: string): string {
    const scope = spaceId ? `spaces/${spaceId}` : "personal";
    return `${scope}/knowledge/${id}.md`;
  }

  private parseNote(path: string, content: string): KnowledgeItem {
    const { frontmatter, body } = this.parseMarkdown(content);
    const spaceId = path.startsWith("spaces/") ? path.split("/")[1] : null;
    
    return {
      id: frontmatter.id || path.split("/").pop()?.replace(".md", "") || crypto.randomUUID(),
      userId: frontmatter.owner || "",
      spaceId,
      title: frontmatter.title || "Untitled",
      kind: frontmatter.kind || "note",
      body,
      tags: frontmatter.tags || [],
      folder: frontmatter.folder || "Unsorted",
      createdAt: frontmatter.created || new Date().toISOString(),
      updatedAt: frontmatter.updated || new Date().toISOString(),
    };
  }

  private serializeNote(note: KnowledgeItem): string {
    const frontmatter = [
      "---",
      `id: ${note.id}`,
      `type: knowledge`,
      `owner: ${note.userId}`,
      note.spaceId ? `space: ${note.spaceId}` : "",
      `title: ${note.title}`,
      `kind: ${note.kind}`,
      `folder: ${note.folder}`,
      note.tags.length > 0 ? `tags: [${note.tags.map(t => `"${t}"`).join(", ")}]` : "",
      `created: ${note.createdAt}`,
      `updated: ${note.updatedAt}`,
      "---",
      "",
      note.body
    ].filter(Boolean).join("\n");
    
    return frontmatter;
  }

  private parseMarkdown(content: string): { frontmatter: any; body: string } {
    let frontmatter: any = {};
    let body = content;
    
    if (content.startsWith("---")) {
      const end = content.indexOf("\n---", 3);
      if (end !== -1) {
        const fmSection = content.slice(3, end);
        body = content.slice(end + 4);
        
        for (const line of fmSection.split("\n")) {
          const colonPos = line.indexOf(":");
          if (colonPos !== -1) {
            const key = line.slice(0, colonPos).trim();
            let value = line.slice(colonPos + 1).trim();
            
            // Handle various value formats
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1);
            } else if (value.startsWith("[") && value.endsWith("]")) {
              try {
                const parsed = JSON.parse(value);
                value = Array.isArray(parsed) ? parsed.join(", ") : value;
              } catch {
                value = "";
              }
            }
            
            frontmatter[key] = value;
          }
        }
      }
    }
    
    return { frontmatter, body };
  }
}

// Singleton instance
export const notesRepository = new NotesRepository();