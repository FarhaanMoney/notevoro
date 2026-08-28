import { vault } from "@/lib/vault";
import type { Conversation, ChatMessage } from "@/types";

/**
 * Voro Repository
 * 
 * Provides a clean abstraction for Voro AI chat operations.
 * Voro conversations are stored in the vault as Markdown files with chat history.
 * Works with both browser and Tauri vault adapters transparently.
 */
export class VoroRepository {
  /**
   * Get all conversations for a specific space or personal conversations
   */
  async listConversations(userId: string, spaceId?: string | null): Promise<Conversation[]> {
    const adapter = vault();
    const scope = spaceId ? `spaces/${spaceId}` : "personal";
    const paths = (await adapter.list(scope)).filter(
      (p) => p.includes("/voro/") && p.endsWith(".md")
    );
    
    const conversations: Conversation[] = [];
    for (const path of paths) {
      const content = await adapter.read(path);
      if (content) {
        conversations.push(this.parseConversation(path, content));
      }
    }
    
    return conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /**
   * Get a specific conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    const adapter = vault();
    for (const scope of ["personal", "spaces"]) {
      const paths = await adapter.list(scope);
      const hit = paths.find((p) => p.includes("/voro/") && p.endsWith(`/${id}.md`));
      if (hit) {
        const content = await adapter.read(hit);
        if (content) {
          return this.parseConversation(hit, content);
        }
      }
    }
    return null;
  }

  /**
   * Create a new conversation
   */
  async createConversation(input: {
    userId: string;
    spaceId: string | null;
    title?: string;
  }): Promise<Conversation> {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      userId: input.userId,
      spaceId: input.spaceId,
      title: input.title || "New conversation",
      createdAt: now,
      updatedAt: now,
    };
    
    const path = this.getConversationPath(conversation.spaceId, conversation.id);
    const content = this.serializeConversation(conversation, []);
    await vault().write(path, content);
    
    return conversation;
  }

  /**
   * Update conversation metadata
   */
  async updateConversation(conversation: Conversation): Promise<Conversation> {
    const updated = { ...conversation, updatedAt: new Date().toISOString() };
    const path = this.getConversationPath(updated.spaceId, updated.id);
    
    // Read existing content to preserve messages
    const existingContent = await vault().read(path);
    const existingMessages = existingContent ? this.parseMessages(existingContent) : [];
    
    const content = this.serializeConversation(updated, existingMessages);
    await vault().write(path, content);
    
    return updated;
  }

  /**
   * Rename a conversation
   */
  async renameConversation(conversation: Conversation, title: string): Promise<Conversation> {
    return this.updateConversation({ ...conversation, title });
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    const adapter = vault();
    for (const scope of ["personal", "spaces"]) {
      const paths = await adapter.list(scope);
      const hit = paths.find((p) => p.includes("/voro/") && p.endsWith(`/${id}.md`));
      if (hit) {
        await adapter.remove(hit);
        return;
      }
    }
  }

  /**
   * Get all messages for a conversation
   */
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return [];
    
    const path = this.getConversationPath(conversation.spaceId, conversationId);
    const content = await vault().read(path);
    
    if (content) {
      return this.parseMessages(content);
    }
    
    return [];
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(input: {
    userId: string;
    conversationId: string;
    role: ChatMessage["role"];
    content: string;
  }): Promise<ChatMessage> {
    const conversation = await this.getConversation(input.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      userId: input.userId,
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      createdAt: new Date().toISOString(),
    };
    
    const path = this.getConversationPath(conversation.spaceId, conversation.id);
    const existingContent = await vault().read(path);
    const existingMessages = existingContent ? this.parseMessages(existingContent) : [];
    
    const updatedMessages = [...existingMessages, message];
    const content = this.serializeConversation(
      { ...conversation, updatedAt: new Date().toISOString() },
      updatedMessages
    );
    
    await vault().write(path, content);
    
    return message;
  }

  /**
   * Search conversations by content or title
   */
  async searchConversations(query: string): Promise<Conversation[]> {
    const adapter = vault();
    const results: Conversation[] = [];
    
    if ('search' in adapter && typeof adapter.search === 'function') {
      const searchResults = await adapter.search(query);
      for (const result of searchResults) {
        if (result.path.includes('/voro/')) {
          const content = await adapter.read(result.path);
          if (content) {
            results.push(this.parseConversation(result.path, content));
          }
        }
      }
    } else {
      // Fallback: manually search all conversations
      const allConversations = await this.listConversations("", null);
      const lowerQuery = query.toLowerCase();
      for (const conversation of allConversations) {
        if (conversation.title.toLowerCase().includes(lowerQuery)) {
          results.push(conversation);
        }
      }
    }
    
    return results;
  }

  private getConversationPath(spaceId: string | null, id: string): string {
    const scope = spaceId ? `spaces/${spaceId}` : "personal";
    return `${scope}/voro/${id}.md`;
  }

  private parseConversation(path: string, content: string): Conversation {
    const { frontmatter } = this.parseMarkdown(content);
    const spaceId = path.startsWith("spaces/") ? path.split("/")[1] : null;
    const id = path.split("/").pop()?.replace(".md", "") || crypto.randomUUID();
    
    return {
      id,
      userId: frontmatter.owner || "",
      spaceId,
      title: frontmatter.title || "Untitled conversation",
      createdAt: frontmatter.created || new Date().toISOString(),
      updatedAt: frontmatter.updated || new Date().toISOString(),
    };
  }

  private parseMessages(content: string): ChatMessage[] {
    const { body } = this.parseMarkdown(content);
    const messages: ChatMessage[] = [];
    
    // Parse messages from body
    const messageRegex = /##\s*(user|assistant)\s*\n([\s\S]*?)(?=##\s*(user|assistant)|$)/g;
    let match;
    
    while ((match = messageRegex.exec(body)) !== null) {
      const role = match[1] as "user" | "assistant";
      const messageContent = match[2].trim();
      
      // Try to extract message ID and timestamp if present
      const idMatch = messageContent.match(/<!--\s*id:\s*([a-f0-9-]+)\s*-->/);
      const timeMatch = messageContent.match(/<!--\s*time:\s*([^\s]+)\s*-->/);
      
      messages.push({
        id: idMatch?.[1] || crypto.randomUUID(),
        userId: "", // Will be set from conversation
        conversationId: "", // Will be set from context
        role,
        content: messageContent
          .replace(/<!--\s*id:\s*[a-f0-9-]+\s*-->/g, "")
          .replace(/<!--\s*time:\s*[^\s]+\s*-->/g, "")
          .trim(),
        createdAt: timeMatch?.[1] || new Date().toISOString(),
      });
    }
    
    return messages;
  }

  private serializeConversation(conversation: Conversation, messages: ChatMessage[]): string {
    const frontmatter = [
      "---",
      `id: ${conversation.id}`,
      `type: conversation`,
      `owner: ${conversation.userId}`,
      conversation.spaceId ? `space: ${conversation.spaceId}` : "",
      `title: ${conversation.title}`,
      `created: ${conversation.createdAt}`,
      `updated: ${conversation.updatedAt}`,
      "---",
      ""
    ].filter(Boolean).join("\n");
    
    let body = "";
    for (const message of messages) {
      body += `## ${message.role}\n`;
      body += `<!-- id: ${message.id} -->\n`;
      body += `<!-- time: ${message.createdAt} -->\n`;
      body += `${message.content}\n\n`;
    }
    
    return frontmatter + body;
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
            
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1);
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
export const voroRepository = new VoroRepository();