import { vault } from "@/lib/vault";
import type { Task, Priority } from "@/types";

/**
 * Tasks Repository
 * 
 * Provides a clean abstraction for task operations.
 * Works with both browser and Tauri vault adapters transparently.
 */
export class TasksRepository {
  /**
   * Get all tasks for a specific space or personal tasks
   */
  async listTasks(userId: string, spaceId?: string | null): Promise<Task[]> {
    const adapter = vault();
    const scope = spaceId ? `spaces/${spaceId}` : "personal";
    const paths = (await adapter.list(scope)).filter(
      (p) => p.includes("/tasks/") && p.endsWith(".md")
    );
    
    const tasks: Task[] = [];
    for (const path of paths) {
      const content = await adapter.read(path);
      if (content) {
        tasks.push(this.parseTask(path, content));
      }
    }
    
    return tasks.sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  }

  /**
   * Get a specific task by ID
   */
  async getTask(id: string): Promise<Task | null> {
    const adapter = vault();
    for (const scope of ["personal", "spaces"]) {
      const paths = await adapter.list(scope);
      const hit = paths.find((p) => p.includes("/tasks/") && p.endsWith(`/${id}.md`));
      if (hit) {
        const content = await adapter.read(hit);
        if (content) {
          return this.parseTask(hit, content);
        }
      }
    }
    return null;
  }

  /**
   * Create a new task
   */
  async createTask(input: {
    userId: string;
    spaceId: string | null;
    title: string;
    priority?: Priority;
    dueDate?: string | null;
    module?: string | null;
  }): Promise<Task> {
    const task: Task = {
      id: crypto.randomUUID(),
      userId: input.userId,
      spaceId: input.spaceId,
      title: input.title.trim(),
      status: "open",
      priority: input.priority ?? "medium",
      dueDate: input.dueDate ?? null,
      module: input.module ?? null,
      createdAt: new Date().toISOString(),
    };
    
    const path = this.getTaskPath(task.spaceId, task.id);
    const content = this.serializeTask(task);
    await vault().write(path, content);
    
    return task;
  }

  /**
   * Update an existing task
   */
  async updateTask(task: Task): Promise<Task> {
    const path = this.getTaskPath(task.spaceId, task.id);
    const content = this.serializeTask(task);
    await vault().write(path, content);
    return task;
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<void> {
    const adapter = vault();
    for (const scope of ["personal", "spaces"]) {
      const paths = await adapter.list(scope);
      const hit = paths.find((p) => p.includes("/tasks/") && p.endsWith(`/${id}.md`));
      if (hit) {
        await adapter.remove(hit);
        return;
      }
    }
  }

  /**
   * Toggle task status between open and done
   */
  async toggleTaskStatus(task: Task): Promise<Task> {
    const updated = { 
      ...task, 
      status: task.status === "open" ? "done" : "open" as "open" | "done"
    };
    return this.updateTask(updated);
  }

  /**
   * Search tasks by content or title
   */
  async searchTasks(query: string): Promise<Task[]> {
    const adapter = vault();
    const results: Task[] = [];
    
    if ('search' in adapter && typeof adapter.search === 'function') {
      const searchResults = await adapter.search(query);
      for (const result of searchResults) {
        if (result.path.includes('/tasks/')) {
          const content = await adapter.read(result.path);
          if (content) {
            results.push(this.parseTask(result.path, content));
          }
        }
      }
    } else {
      // Fallback: manually search all tasks
      const allTasks = await this.listTasks("", null); // Get all tasks
      const lowerQuery = query.toLowerCase();
      for (const task of allTasks) {
        if (task.title.toLowerCase().includes(lowerQuery) || 
            (task.module && task.module.toLowerCase().includes(lowerQuery))) {
          results.push(task);
        }
      }
    }
    
    return results;
  }

  private getTaskPath(spaceId: string | null, id: string): string {
    const scope = spaceId ? `spaces/${spaceId}` : "personal";
    return `${scope}/tasks/${id}.md`;
  }

  private parseTask(path: string, content: string): Task {
    const { frontmatter } = this.parseMarkdown(content);
    const spaceId = path.startsWith("spaces/") ? path.split("/")[1] : null;
    
    const priority = ["low", "medium", "high"].includes(frontmatter.priority) 
      ? frontmatter.priority as Priority 
      : "medium";
    
    return {
      id: frontmatter.id || path.split("/").pop()?.replace(".md", "") || crypto.randomUUID(),
      userId: frontmatter.owner || "",
      spaceId,
      title: frontmatter.title || "Untitled task",
      status: frontmatter.status === "done" ? "done" : "open",
      priority,
      dueDate: frontmatter.due || null,
      module: frontmatter.module || null,
      createdAt: frontmatter.created || new Date().toISOString(),
    };
  }

  private serializeTask(task: Task): string {
    const frontmatter = [
      "---",
      `id: ${task.id}`,
      `type: task`,
      `owner: ${task.userId}`,
      task.spaceId ? `space: ${task.spaceId}` : "",
      `title: ${task.title}`,
      `status: ${task.status}`,
      `priority: ${task.priority}`,
      task.dueDate ? `due: ${task.dueDate}` : "",
      task.module ? `module: ${task.module}` : "",
      `created: ${task.createdAt}`,
      "---",
      ""
    ].filter(Boolean).join("\n");
    
    return frontmatter;
  }

  private parseMarkdown(content: string): { frontmatter: any } {
    let frontmatter: any = {};
    
    if (content.startsWith("---")) {
      const end = content.indexOf("\n---", 3);
      if (end !== -1) {
        const fmSection = content.slice(3, end);
        
        for (const line of fmSection.split("\n")) {
          const colonPos = line.indexOf(":");
          if (colonPos !== -1) {
            const key = line.slice(0, colonPos).trim();
            let value = line.slice(colonPos + 1).trim();
            
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1);
            }
            
            frontmatter[key] = value;
          }
        }
      }
    }
    
    return { frontmatter };
  }
}

// Singleton instance
export const tasksRepository = new TasksRepository();