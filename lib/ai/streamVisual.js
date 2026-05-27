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
      type: 'lesson',
      stepId: 1,
      lessonType: 'astronomy',
      template: 'black_hole',
      title: `${baseTitle}`,
      subtitle: 'An immersive black hole simulation',
      description: 'Watch matter spiral into the event horizon while the AI explains gravity and accretion.',
      theme: 'cosmic',
      visualCues: ['Accretion disk motion', 'Orbiting particles', 'Energy flow into the singularity'],
      actions: [
        { op: 'set_lesson', lessonType: 'astronomy', template: 'black_hole', title: `${baseTitle}`, subtitle: 'An immersive black hole simulation', description: 'Watch matter spiral into the event horizon while the AI explains gravity and accretion.', theme: 'cosmic' },
      ],
    },
    {
      type: 'step',
      stepId: 2,
      title: 'Accretion disk formation',
      description: 'The disk brightens and particles begin orbiting the black hole.',
      narration: 'The dense disk around the black hole heats up as matter falls inward.',
      visualCues: ['Disk rotation', 'Particle stream', 'Event horizon glow'],
      actions: [
        { op: 'add_step', stepId: 2, title: 'Accretion disk formation', description: 'The disk brightens and particles begin orbiting the black hole.', narration: 'The dense disk around the black hole heats up as matter falls inward.', visualCues: ['Disk rotation', 'Particle stream', 'Event horizon glow'] },
      ],
    },
    {
      type: 'step',
      stepId: 3,
      title: 'Gravity and motion',
      description: 'Orbiting particles accelerate as they are pulled inward by gravity.',
      narration: 'The closer a particle gets, the faster it must move to stay in orbit.',
      visualCues: ['Orbital acceleration', 'Gravity pull', 'Spiral motion'],
      actions: [
        { op: 'add_step', stepId: 3, title: 'Gravity and motion', description: 'Orbiting particles accelerate as they are pulled inward by gravity.', narration: 'The closer a particle gets, the faster it must move to stay in orbit.', visualCues: ['Orbital acceleration', 'Gravity pull', 'Spiral motion'] },
      ],
    },
    {
      type: 'step',
      stepId: 4,
      title: 'Interactive checkpoint',
      description: 'A quick question tests your understanding of the black hole structure.',
      narration: 'Which part of the system marks the point of no return?',
      visualCues: ['Event horizon highlight', 'Particle motion freeze'],
      actions: [
        { op: 'add_step', stepId: 4, title: 'Interactive checkpoint', description: 'A quick question tests your understanding of the black hole structure.', narration: 'Which part of the system marks the point of no return?', visualCues: ['Event horizon highlight', 'Particle motion freeze'] },
        { op: 'quiz_popup', question: 'Which region marks the point of no return?', choices: ['Accretion disk', 'Event horizon', 'Singularity'], correctIndex: 1 },
      ],
    },
    {
      type: 'step',
      stepId: 5,
      title: 'Lesson recap',
      description: 'Summary of the black hole simulation and the key physics behind it.',
      narration: 'The lesson wraps up with the main idea: gravity shapes motion as matter falls inward.',
      visualCues: ['Key takeaway recap', 'Motion return'],
      actions: [
        { op: 'add_step', stepId: 5, title: 'Lesson recap', description: 'Summary of the black hole simulation and the key physics behind it.', narration: 'The lesson wraps up with the main idea: gravity shapes motion as matter falls inward.', visualCues: ['Key takeaway recap', 'Motion return'] },
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
  }

  const trimmed = buffer.trim();
  if (!trimmed) {
    yield { type: 'error', message: 'AI returned an empty response' };
    return;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    const extracted = extractJsonObject(trimmed);
    if (extracted) {
      try {
        parsed = JSON.parse(extracted.jsonText);
      } catch (innerError) {
        console.warn('streamVisualFromAI JSON extraction failed', innerError);
      }
    }
  }

  if (parsed && typeof parsed === 'object') {
    yield parsed;
    return;
  }

  console.error('streamVisualFromAI failed to parse final JSON response', trimmed);
  yield { type: 'error', message: 'AI returned invalid lesson JSON' };
}
