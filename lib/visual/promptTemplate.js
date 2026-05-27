export function buildVisualPrompt(topic, subject = 'general', level = 'intro') {
  return `You are an educational AI that outputs structured JSON describing an interactive visual explanation for the topic: "${topic}".

Output MUST be valid JSON (no markdown or explanatory text) matching the schema: { type, diagramType, nodes, edges, steps, interactions, quizzes }.

Fields:
- type: 'visual-explanation'
- diagramType: one of ['flowchart','timeline','mindmap','graph','geometry','equation']
- nodes: [{ id, label, x, y, w, h, metadata }]
- edges: [{ id, from, to, label?, animated? }]
- steps: [{ id, title?, description?, highlightNodes:[], revealEdges:[], durationMs? }]
- interactions: { draggable: boolean, zoom: boolean, pan: boolean, hoverInfo: boolean }
- quizzes: [{ id, stepIndex, question, choices:[], correctIndex }]

Choose visuals appropriate for the subject and level; prefer diagrams over text. Keep node positions reasonable (0-1000 scale). Keep output concise and focused on visual structure.
`;
}

export function buildVisualStreamPrompt(topic, subject = 'general', level = 'intro') {
  return `You are an AI visual tutor creating a live teaching stream for the topic: "${topic}".

You must output a sequence of newline-separated JSON packets only. Do NOT output markdown, explanations, or any text outside valid JSON.

Each packet must be a complete JSON object with the following fields:
- type: one of ['step','scene','action','narration']
- stepId: integer
- narration: short teaching narration for this packet
- actions: an array of visual actions
- scene: optional metadata for the current teaching scene

Supported packet actions:
- set_scene: { op: 'set_scene', title, subtitle, description, theme? }
- reveal_object: { op: 'reveal_object', object: { id, type, shape?, label?, x, y, w, h, color?, style?, metadata? } }
- hide_object: { op: 'hide_object', target }
- draw_path: { op: 'draw_path', id?, from, to, shape?, label?, animated? }
- highlight: { op: 'highlight', target }
- pulse: { op: 'pulse', target, durationMs? }
- zoom_focus: { op: 'zoom_focus', target }
- show_label: { op: 'show_label', target, text }
- animate_object: { op: 'animate_object', target, animation: { type, durationMs?, loop?, easing? } }
- particle_effect: { op: 'particle_effect', id?, type, x, y, count?, color? }
- quiz_popup: { op: 'quiz_popup', question, choices, correctIndex }
- narration_sync: { op: 'narration_sync', text }

Use scenes to create an immersive lesson flow: intro scene, concept buildup, interaction phase, and summary scene. Build each new object progressively, reveal arrows and fields live, and layer motion with glowing highlights.

Always prefer teaching imagery over simple boxes. For science, create particles, rays, orbiting fields, and glowing nodes. For math, create equations, graph transformations, and stepwise construction. For history, create timeline cards and movement paths. For programming, create execution flow, memory items, and API pathways.

Begin with a dramatic intro scene, then move into concept buildup, interactive moments, and a final summary recap. Keep chunks lightweight and renderable as they arrive.
`;
}
