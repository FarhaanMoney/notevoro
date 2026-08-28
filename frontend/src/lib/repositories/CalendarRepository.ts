import { vault } from "@/lib/vault";
import type { CalendarEvent } from "@/types";

/**
 * Calendar Repository
 * 
 * Provides a clean abstraction for calendar event operations.
 * Works with both browser and Tauri vault adapters transparently.
 */
export class CalendarRepository {
  /**
   * Get all events for a specific space or personal events
   */
  async listEvents(userId: string, spaceId?: string | null): Promise<CalendarEvent[]> {
    const adapter = vault();
    const scope = spaceId ? `spaces/${spaceId}` : "personal";
    const paths = (await adapter.list(scope)).filter(
      (p) => p.includes("/calendar/") && p.endsWith(".md")
    );
    
    const events: CalendarEvent[] = [];
    for (const path of paths) {
      const content = await adapter.read(path);
      if (content) {
        events.push(this.parseEvent(path, content));
      }
    }
    
    return events.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  }

  /**
   * Get events for a specific date range
   */
  async getEventsInRange(startDate: string, endDate: string, spaceId?: string | null): Promise<CalendarEvent[]> {
    const allEvents = await this.listEvents("", spaceId);
    return allEvents.filter(event => 
      event.date >= startDate && event.date <= endDate
    );
  }

  /**
   * Get a specific event by ID
   */
  async getEvent(id: string): Promise<CalendarEvent | null> {
    const adapter = vault();
    for (const scope of ["personal", "spaces"]) {
      const paths = await adapter.list(scope);
      const hit = paths.find((p) => p.includes("/calendar/") && p.endsWith(`/${id}.md`));
      if (hit) {
        const content = await adapter.read(hit);
        if (content) {
          return this.parseEvent(hit, content);
        }
      }
    }
    return null;
  }

  /**
   * Create a new event
   */
  async createEvent(input: {
    userId: string;
    spaceId: string | null;
    title: string;
    date: string;
    time: string;
    location?: string;
  }): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      userId: input.userId,
      spaceId: input.spaceId,
      title: input.title.trim(),
      date: input.date,
      time: input.time,
      location: input.location?.trim() || "",
      createdAt: new Date().toISOString(),
    };
    
    const path = this.getEventPath(event.spaceId, event.id);
    const content = this.serializeEvent(event);
    await vault().write(path, content);
    
    return event;
  }

  /**
   * Update an existing event
   */
  async updateEvent(event: CalendarEvent): Promise<CalendarEvent> {
    const path = this.getEventPath(event.spaceId, event.id);
    const content = this.serializeEvent(event);
    await vault().write(path, content);
    return event;
  }

  /**
   * Delete an event
   */
  async deleteEvent(id: string): Promise<void> {
    const adapter = vault();
    for (const scope of ["personal", "spaces"]) {
      const paths = await adapter.list(scope);
      const hit = paths.find((p) => p.includes("/calendar/") && p.endsWith(`/${id}.md`));
      if (hit) {
        await adapter.remove(hit);
        return;
      }
    }
  }

  /**
   * Search events by content or title
   */
  async searchEvents(query: string): Promise<CalendarEvent[]> {
    const adapter = vault();
    const results: CalendarEvent[] = [];
    
    if ('search' in adapter && typeof adapter.search === 'function') {
      const searchResults = await adapter.search(query);
      for (const result of searchResults) {
        if (result.path.includes('/calendar/')) {
          const content = await adapter.read(result.path);
          if (content) {
            results.push(this.parseEvent(result.path, content));
          }
        }
      }
    } else {
      // Fallback: manually search all events
      const allEvents = await this.listEvents("", null); // Get all events
      const lowerQuery = query.toLowerCase();
      for (const event of allEvents) {
        if (event.title.toLowerCase().includes(lowerQuery) || 
            (event.location && event.location.toLowerCase().includes(lowerQuery))) {
          results.push(event);
        }
      }
    }
    
    return results;
  }

  private getEventPath(spaceId: string | null, id: string): string {
    const scope = spaceId ? `spaces/${spaceId}` : "personal";
    return `${scope}/calendar/${id}.md`;
  }

  private parseEvent(path: string, content: string): CalendarEvent {
    const { frontmatter } = this.parseMarkdown(content);
    const spaceId = path.startsWith("spaces/") ? path.split("/")[1] : null;
    
    return {
      id: frontmatter.id || path.split("/").pop()?.replace(".md", "") || crypto.randomUUID(),
      userId: frontmatter.owner || "",
      spaceId,
      title: frontmatter.title || "Untitled event",
      date: frontmatter.date || new Date().toISOString().slice(0, 10),
      time: frontmatter.time || "09:00",
      location: frontmatter.location || "",
      createdAt: frontmatter.created || new Date().toISOString(),
    };
  }

  private serializeEvent(event: CalendarEvent): string {
    const frontmatter = [
      "---",
      `id: ${event.id}`,
      `type: event`,
      `owner: ${event.userId}`,
      event.spaceId ? `space: ${event.spaceId}` : "",
      `title: ${event.title}`,
      `date: ${event.date}`,
      `time: ${event.time}`,
      event.location ? `location: ${event.location}` : "",
      `created: ${event.createdAt}`,
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
export const calendarRepository = new CalendarRepository();