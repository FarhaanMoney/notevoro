import { vault } from "@/lib/vault";
import type { LocalSpace } from "@/types";

/**
 * Spaces Repository
 * 
 * Provides a clean abstraction for space operations.
 * Works with both browser and Tauri vault adapters transparently.
 */
export class SpacesRepository {
  /**
   * Get all spaces
   */
  async listSpaces(): Promise<LocalSpace[]> {
    const adapter = vault();
    const paths = await adapter.list("spaces");
    const spaceIds = new Set<string>();
    
    // Extract unique space IDs from paths
    for (const path of paths) {
      const match = path.match(/^spaces\/([^\/]+)/);
      if (match) {
        spaceIds.add(match[1]);
      }
    }
    
    const spaces: LocalSpace[] = [];
    for (const spaceId of spaceIds) {
      const spaceInfo = await this.getSpaceInfo(spaceId);
      if (spaceInfo) {
        spaces.push(spaceInfo);
      }
    }
    
    return spaces.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get a specific space by ID
   */
  async getSpace(id: string): Promise<LocalSpace | null> {
    return this.getSpaceInfo(id);
  }

  /**
   * Create a new space
   */
  async createSpace(input: {
    userId: string;
    name: string;
    template: "student" | "educator" | "professional" | "blank";
    description?: string;
  }): Promise<LocalSpace> {
    const spaceId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const space: LocalSpace = {
      id: spaceId,
      userId: input.userId,
      name: input.name.trim(),
      template: input.template,
      description: input.description?.trim() || "",
      createdAt: now,
      updatedAt: now,
    };
    
    // Create space directory structure
    const spacePath = `spaces/${spaceId}`;
    const adapter = vault();
    if (adapter.createFolder) {
      await adapter.createFolder(`${spacePath}/tasks`);
      await adapter.createFolder(`${spacePath}/knowledge`);
      await adapter.createFolder(`${spacePath}/calendar`);
      await adapter.createFolder(`${spacePath}/documents`);
      await adapter.createFolder(`${spacePath}/voro`);
    }
    
    // Create space metadata file
    const metadataPath = `${spacePath}/space.md`;
    const metadataContent = this.serializeSpace(space);
    await vault().write(metadataPath, metadataContent);
    
    // Create template-specific content
    await this.applyTemplate(spaceId, input.template);
    
    return space;
  }

  /**
   * Update an existing space
   */
  async updateSpace(space: LocalSpace): Promise<LocalSpace> {
    const updated = { ...space, updatedAt: new Date().toISOString() };
    const metadataPath = `spaces/${space.id}/space.md`;
    const metadataContent = this.serializeSpace(updated);
    await vault().write(metadataPath, metadataContent);
    return updated;
  }

  /**
   * Delete a space and all its content
   */
  async deleteSpace(id: string): Promise<void> {
    const adapter = vault();
    const spacePath = `spaces/${id}`;
    
    // Remove all files in the space directory
    const paths = await adapter.list(spacePath);
    for (const path of paths) {
      await adapter.remove(path);
    }
    
    // Remove the space directory itself
    await adapter.remove(spacePath);
  }

  /**
   * Get space statistics
   */
  async getSpaceStats(spaceId: string): Promise<{
    tasksCount: number;
    knowledgeCount: number;
    eventsCount: number;
    documentsCount: number;
  }> {
    const adapter = vault();
    const spacePath = `spaces/${spaceId}`;
    
    const paths = await adapter.list(spacePath);
    
    return {
      tasksCount: paths.filter(p => p.includes('/tasks/') && p.endsWith('.md')).length,
      knowledgeCount: paths.filter(p => p.includes('/knowledge/') && p.endsWith('.md')).length,
      eventsCount: paths.filter(p => p.includes('/calendar/') && p.endsWith('.md')).length,
      documentsCount: paths.filter(p => p.includes('/documents/') && !p.endsWith('.md')).length,
    };
  }

  private async getSpaceInfo(spaceId: string): Promise<LocalSpace | null> {
    const adapter = vault();
    const metadataPath = `spaces/${spaceId}/space.md`;
    const content = await adapter.read(metadataPath);
    
    if (content) {
      return this.parseSpace(content, spaceId);
    }
    
    // Fallback: create basic space info from directory structure
    return {
      id: spaceId,
      userId: "",
      name: spaceId,
      template: "blank",
      description: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private async applyTemplate(spaceId: string, template: string): Promise<void> {
    const spacePath = `spaces/${spaceId}`;
    
    // Template-specific initial content
    const templates: Record<string, { tasks: string[]; knowledge: string[] }> = {
      student: {
        tasks: [
          "Complete assignment",
          "Study for exam",
          "Review lecture notes"
        ],
        knowledge: [
          "Course notes",
          "Study guides",
          "Research materials"
        ]
      },
      educator: {
        tasks: [
          "Prepare lecture",
          "Grade assignments",
          "Update syllabus"
        ],
        knowledge: [
          "Lecture materials",
          "Course content",
          "Student resources"
        ]
      },
      professional: {
        tasks: [
          "Project milestone",
          "Client meeting",
          "Document review"
        ],
        knowledge: [
          "Project documentation",
          "Meeting notes",
          "Client communications"
        ]
      },
      blank: {
        tasks: [],
        knowledge: []
      }
    };
    
    const templateContent = templates[template] || templates.blank;
    
    // Create template tasks
    for (const taskTitle of templateContent.tasks) {
      const taskPath = `${spacePath}/tasks/${crypto.randomUUID()}.md`;
      const taskContent = [
        "---",
        `title: ${taskTitle}`,
        `type: task`,
        `status: open`,
        `priority: medium`,
        `created: ${new Date().toISOString()}`,
        "---",
        ""
      ].join("\n");
      await vault().write(taskPath, taskContent);
    }
    
    // Create template knowledge items
    for (const knowledgeTitle of templateContent.knowledge) {
      const knowledgePath = `${spacePath}/knowledge/${crypto.randomUUID()}.md`;
      const knowledgeContent = [
        "---",
        `title: ${knowledgeTitle}`,
        `type: knowledge`,
        `kind: note`,
        `folder: Unsorted`,
        `created: ${new Date().toISOString()}`,
        `updated: ${new Date().toISOString()}`,
        "---",
        ""
      ].join("\n");
      await vault().write(knowledgePath, knowledgeContent);
    }
  }

  private parseSpace(content: string, spaceId: string): LocalSpace {
    const { frontmatter } = this.parseMarkdown(content);
    
    return {
      id: spaceId,
      userId: frontmatter.owner || "",
      name: frontmatter.name || spaceId,
      template: frontmatter.template || "blank",
      description: frontmatter.description || "",
      createdAt: frontmatter.created || new Date().toISOString(),
      updatedAt: frontmatter.updated || new Date().toISOString(),
    };
  }

  private serializeSpace(space: LocalSpace): string {
    const frontmatter = [
      "---",
      `id: ${space.id}`,
      `type: space`,
      `owner: ${space.userId}`,
      `name: ${space.name}`,
      `template: ${space.template}`,
      `description: ${space.description}`,
      `created: ${space.createdAt}`,
      `updated: ${space.updatedAt}`,
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
export const spacesRepository = new SpacesRepository();