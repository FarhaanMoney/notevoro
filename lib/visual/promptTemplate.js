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
- type: one of ['step','action','narration']
- stepId: integer
- narration: short teaching narration for this packet
- actions: an array of visual actions

Supported actions:
- reveal_node: { op: 'reveal_node', node: { id, label, x, y, w, h, metadata? } }
- hide_node: { op: 'hide_node', target }
- draw_edge: { op: 'draw_edge', id?, from, to, label?, animated? }
- highlight: { op: 'highlight', target }
- pulse: { op: 'pulse', target, durationMs? }
- zoom_focus: { op: 'zoom_focus', target }
- quiz_popup: { op: 'quiz_popup', question, choices, correctIndex }
- narration_sync: { op: 'narration_sync', text }

Begin with stepId 1 and send each concept progressively. Make the learner feel the AI is teaching live by revealing nodes, drawing arrows, and synchronizing narration.
`;
}
