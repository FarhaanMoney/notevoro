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
  const baseTitle = topic;
  const titleObject = {
    id: 'title',
    type: 'banner',
    shape: 'rect',
    label: baseTitle,
    x: 160,
    y: 48,
    w: 500,
    h: 90,
    color: '#7c3aed',
    style: { gradient: ['#7c3aed', '#22d3ee'], glow: true },
    metadata: { note: 'Lesson title' },
  };

  const coreObject = {
    id: 'core',
    type: 'shape',
    shape: 'circle',
    label: 'Core concept',
    x: 360,
    y: 220,
    w: 220,
    h: 220,
    color: '#1d4ed8',
    style: { glow: true, blur: 8 },
    metadata: { note: 'This is the central idea the lesson builds around.' },
  };

  const secondaryA = {
    id: 'branchA',
    type: 'shape',
    shape: 'rect',
    label: 'Key idea',
    x: 100,
    y: 320,
    w: 180,
    h: 80,
    color: '#f97316',
    style: { glow: true },
    metadata: { note: 'Supporting concept A' },
  };

  const secondaryB = {
    id: 'branchB',
    type: 'shape',
    shape: 'rect',
    label: 'Outcome',
    x: 540,
    y: 320,
    w: 180,
    h: 80,
    color: '#10b981',
    style: { glow: true },
    metadata: { note: 'Supporting concept B' },
  };

  const packets = [
    {
      type: 'scene',
      stepId: 1,
      narration: `Intro scene: ${baseTitle} appears as a cinematic lesson opening.`,
      actions: [
        { op: 'set_scene', title: `${baseTitle}`, subtitle: 'Live visual learning begins', description: 'Watch the AI build the concept with motion and light.' },
        { op: 'reveal_object', object: titleObject },
        { op: 'pulse', target: 'title', durationMs: 1600 },
        { op: 'particle_effect', id: 'introRays', type: 'rays', x: 460, y: 100, count: 10, color: '#8b5cf6' },
      ],
    },
    {
      type: 'step',
      stepId: 2,
      narration: 'Concept buildup: reveal the main idea and begin drawing relationships.',
      actions: [
        { op: 'reveal_object', object: coreObject },
        { op: 'draw_path', id: 'pathA', from: 'title', to: 'core', shape: 'curve', animated: true },
        { op: 'zoom_focus', target: 'core' },
        { op: 'narration_sync', text: 'This is the central concept. We will connect the supporting ideas next.' },
      ],
    },
    {
      type: 'step',
      stepId: 3,
      narration: 'Add supporting details and shine a spotlight on the relationship flow.',
      actions: [
        { op: 'reveal_object', object: secondaryA },
        { op: 'reveal_object', object: secondaryB },
        { op: 'draw_path', id: 'pathB', from: 'core', to: 'branchA', shape: 'arrow', animated: true },
        { op: 'draw_path', id: 'pathC', from: 'core', to: 'branchB', shape: 'arrow', animated: true },
        { op: 'highlight', target: 'core' },
        { op: 'pulse', target: 'branchB', durationMs: 1400 },
      ],
    },
    {
      type: 'step',
      stepId: 4,
      narration: 'Interactive moment: preview a quick challenge and invite the learner to reflect.',
      actions: [
        { op: 'quiz_popup', question: 'Which part is the main idea?', choices: ['Core concept', 'Key idea', 'Outcome'], correctIndex: 0 },
        { op: 'highlight', target: 'core' },
        { op: 'set_scene', title: `${baseTitle} — Interactive check`, subtitle: 'Try this quick question', description: 'Tap the answer and keep following the live explanation.' },
      ],
    },
    {
      type: 'step',
      stepId: 5,
      narration: 'Summary scene: recap the flow and keep the lesson visually alive.',
      actions: [
        { op: 'set_scene', title: 'Summary', subtitle: 'Key takeaways', description: 'The AI recaps the visual story and highlights the central path.' },
        { op: 'highlight', target: 'pathB' },
        { op: 'highlight', target: 'pathC' },
        { op: 'pulse', target: 'core', durationMs: 1200 },
      ],
    },
  ];

  for (const packet of packets) {
    yield packet;
    await new Promise((resolve) => setTimeout(resolve, 900));
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
      max_tokens: 1400,
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
