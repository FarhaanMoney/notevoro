'use strict';

import OpenAI from 'openai';
import { buildVisualStreamPrompt } from '../visual/promptTemplate.js';

const DEFAULT_OPENAI_BASE_URL = 'https://api.aicredits.in/v1';
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).replace(/\/+$|\s+/g, '');

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: OPENAI_BASE_URL,
  });
}

function extractJsonObject(buffer) {
  const start = buffer.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < buffer.length; i += 1) {
    const ch = buffer[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      depth += 1;
      continue;
    }

    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          jsonText: buffer.slice(start, i + 1),
          rest: buffer.slice(i + 1),
        };
      }
    }
  }

  return null;
}

function parseSSEChunks(buffer) {
  const events = [];
  let remainder = buffer;

  while (true) {
    const separatorIndex = remainder.indexOf('\n\n');
    if (separatorIndex === -1) break;

    const fragment = remainder.slice(0, separatorIndex).trim();
    remainder = remainder.slice(separatorIndex + 2);

    if (!fragment) continue;

    const lines = fragment.split(/\r?\n/);
    const dataLines = lines
      .filter((line) => line.trim().startsWith('data:'))
      .map((line) => line.replace(/^data:\s*/, ''))
      .join(' ')
      .trim();

    if (!dataLines) continue;

    try {
      const packet = JSON.parse(dataLines);
      events.push(packet);
    } catch (error) {
      // Keep partial or malformed SSE events for fallback parsing below.
      const extracted = extractJsonObject(dataLines);
      if (extracted) {
        try {
          events.push(JSON.parse(extracted.jsonText));
        } catch (e) {
          // ignore invalid packet
        }
      }
    }
  }

  return { events, remainder };
}

async function* mockVisualStream(topic) {
  const baseNode = {
    id: 'topic',
    label: topic,
    x: 260,
    y: 80,
    w: 260,
    h: 68,
    metadata: { note: 'Core concept' },
  };

  const stepPackets = [
    {
      type: 'step',
      stepId: 1,
      narration: `Let's map the main idea: ${topic}. Start by revealing the central concept on the whiteboard.`,
      actions: [
        { op: 'reveal_node', node: baseNode },
        { op: 'pulse', target: 'topic', durationMs: 1000 },
      ],
    },
    {
      type: 'step',
      stepId: 2,
      narration: 'Now add the first supporting idea and connect it with a glowing arrow.',
      actions: [
        { op: 'reveal_node', node: { id: 'support1', label: 'Core process', x: 120, y: 240, w: 220, h: 56, metadata: { note: 'What happens here' } } },
        { op: 'draw_edge', id: 'edge1', from: 'topic', to: 'support1', animated: true },
        { op: 'highlight', target: 'support1' },
      ],
    },
    {
      type: 'step',
      stepId: 3,
      narration: 'Add a second supporting idea and highlight the entire flow.',
      actions: [
        { op: 'reveal_node', node: { id: 'support2', label: 'Result', x: 420, y: 240, w: 220, h: 56, metadata: { note: 'The outcome' } } },
        { op: 'draw_edge', id: 'edge2', from: 'topic', to: 'support2', animated: true },
        { op: 'highlight', target: 'topic' },
        { op: 'pulse', target: 'support2', durationMs: 1200 },
      ],
    },
    {
      type: 'step',
      stepId: 4,
      narration: 'Finish by focusing the learner on the path and inviting them to explore the full explanation.',
      actions: [
        { op: 'zoom_focus', target: 'topic' },
        { op: 'narration_sync', text: 'This is your visual learning path — each concept unfolds step by step.' },
      ],
    },
  ];

  for (const packet of stepPackets) {
    yield packet;
    await new Promise((resolve) => setTimeout(resolve, 850));
  }
}

export async function* streamVisualFromAI(topic, subject = 'general', level = 'intro') {
  const prompt = buildVisualStreamPrompt(topic, subject, level);
  let client;

  try {
    client = getOpenAIClient();
  } catch (err) {
    yield* mockVisualStream(topic);
    return;
  }

  let aiStream;
  try {
    aiStream = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      stream: true,
      messages: [
        { role: 'system', content: 'You are a visual tutor that streams teaching actions one step at a time.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 1200,
    });
  } catch (err) {
    console.error('Visual stream init failed, falling back to mock stream:', err);
    yield* mockVisualStream(topic);
    return;
  }

  let buffer = '';
  for await (const chunk of aiStream) {
    const delta = chunk.choices?.[0]?.delta?.content || '';
    if (!delta) continue;

    buffer += delta;
    const { events, remainder } = parseSSEChunks(buffer);
    buffer = remainder;

    for (const event of events) {
      yield event;
    }
  }

  if (buffer.trim()) {
    const parsed = extractJsonObject(buffer);
    if (parsed) {
      try {
        yield JSON.parse(parsed.jsonText);
      } catch (err) {
        // ignore malformed tail
      }
    }
  }
}
