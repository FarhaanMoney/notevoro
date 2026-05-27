import { buildVisualPrompt } from '../visual/promptTemplate.js';

const API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_OPENAI_BASE_URL = 'https://api.aicredits.in/v1';
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, '');

async function callAI(prompt) {
  if (!API_KEY) return null;
  try {
    const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: prompt }], temperature: 0.7, max_tokens: 1500 }),
    });
    if (!res.ok) throw new Error(`AI response ${res.status}`);
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    return content || null;
  } catch (err) {
    try {
      // fallback to default host if different
      if (!OPENAI_BASE_URL.includes('aicredits.in')) {
        const res2 = await fetch(`${DEFAULT_OPENAI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: prompt }], temperature: 0.7, max_tokens: 1500 }),
        });
        if (!res2.ok) throw new Error(`AI fallback ${res2.status}`);
        const json2 = await res2.json();
        return json2.choices?.[0]?.message?.content || null;
      }
    } catch (e) {
      return null;
    }
    return null;
  }
}

export async function generateVisualFromAI(topic, subject = 'general', level = 'intro') {
  const prompt = buildVisualPrompt(topic, subject, level);
  const content = await callAI(prompt);
  if (!content) {
    // Return a mock visual JSON as fallback
    return {
      type: 'visual-explanation',
      diagramType: 'flowchart',
      nodes: [
        { id: 'n1', label: topic, x: 200, y: 80, w: 220, h: 60 },
        { id: 'n2', label: 'Step 1', x: 200, y: 200, w: 160, h: 48 },
        { id: 'n3', label: 'Step 2', x: 200, y: 320, w: 160, h: 48 }
      ],
      edges: [ { id: 'e1', from: 'n1', to: 'n2', animated: true }, { id: 'e2', from: 'n2', to: 'n3' } ],
      steps: [
        { id: 's1', title: 'Intro', description: 'Overview', highlightNodes: ['n1'], durationMs: 1200 },
        { id: 's2', title: 'Walkthrough', description: 'Do step 1', highlightNodes: ['n2'], durationMs: 1400 }
      ],
      interactions: { draggable: true, zoom: true, pan: true, hoverInfo: true },
      quizzes: []
    };
  }

  try {
    // AI might return JSON as string; parse safely
    const parsed = JSON.parse(content);
    return parsed;
  } catch (err) {
    // If AI returned non-JSON, attempt to extract JSON substring
    const m = content.match(/\{[\s\S]*\}/m);
    if (m) {
      try { return JSON.parse(m[0]); } catch (e) { return null; }
    }
    return null;
  }
}
