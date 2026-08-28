/**
 * AI Provider Interface
 * 
 * Supports BYOK (Bring Your Own Key) architecture with multiple providers.
 * The user's API key is stored locally and never sent to Notevoro servers.
 */

export interface AIProviderConfig {
  name: string;
  baseUrl?: string;
  model: string;
}

export interface AIProvider extends AIProviderConfig {
  apiKey: string;
}

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
}

/**
 * AI Client Interface
 * Abstract interface for different AI providers
 */
export interface AIClient {
  chat(messages: AIMessage[], options?: AIOptions): Promise<AIResponse>;
  streamChat(messages: AIMessage[], options?: AIOptions): AsyncGenerator<AIStreamChunk>;
}

export interface AIOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

/**
 * OpenAI-compatible client
 * Works with OpenAI, various compatible APIs, and local models
 */
export class OpenAIClient implements AIClient {
  private provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  async chat(messages: AIMessage[], options?: AIOptions): Promise<AIResponse> {
    const response = await fetch(`${this.provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.provider.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || this.provider.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      model: data.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  async *streamChat(messages: AIMessage[], options?: AIOptions): AsyncGenerator<AIStreamChunk> {
    const response = await fetch(`${this.provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.provider.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || this.provider.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(line => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            yield { content: "", done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || "";
            if (content) {
              yield { content, done: false };
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }
}

/**
 * AI Provider Factory
 * Creates appropriate AI client based on provider configuration
 */
export function createAIClient(provider: AIProvider): AIClient {
  // Default to OpenAI-compatible client
  // Can be extended to support other providers (Anthropic, Google, etc.)
  return new OpenAIClient(provider);
}

/**
 * Default AI providers
 */
export const DEFAULT_PROVIDERS = {
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    model: "claude-3-haiku-20240307",
  },
  local: {
    name: "Local Model",
    baseUrl: "http://localhost:11434/v1", // Ollama default
    model: "llama2",
  },
  custom: {
    name: "Custom",
    baseUrl: "",
    model: "",
  },
} as const;