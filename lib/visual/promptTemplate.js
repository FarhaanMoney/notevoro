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

Each packet must be a complete JSON object with one of these top-level packet shapes:
- lesson: defines the lesson template and metadata
- scene: updates the current visual scene
- step: advances the lesson with a new step
- action: a single visual action
- narration: synchronization text only

Lesson packets must include:
- type: 'lesson'
- lessonType: one of ['astronomy','biology','physics','math','programming','history','general']
- template: a template identifier such as 'black_hole', 'photosynthesis', 'gravity', 'graphs', 'api_flow', 'timeline'
- title
- subtitle
- description
- theme? (optional)
- steps: optional array of step summaries

Step packets must include:
- type: 'step'
- stepId: integer
- title
- description
- narration
- visualCues: optional array of strings
- actions: optional array of action objects

Supported action objects:
- set_lesson: { op: 'set_lesson', lessonType, template, title?, subtitle?, description?, theme?, moduleData? }
- set_scene: { op: 'set_scene', title?, subtitle?, description?, theme? }
- add_step: { op: 'add_step', stepId?, title?, description?, narration?, visualCues?, actions? }
- advance_step: { op: 'advance_step', index? }
- add_visual_cue: { op: 'add_visual_cue', cue }
- quiz_popup: { op: 'quiz_popup', question, choices, correctIndex }
- narration_sync: { op: 'narration_sync', text }

The AI must not generate raw nodes, boxes, or disconnected diagrams. Instead, choose one of the prebuilt visual modules and emit lesson metadata that the frontend can render via a specialized component.

For example:
{
  "type":"lesson",
  "lessonType":"astronomy",
  "template":"black_hole",
  "title":"Black hole gravity",
  "subtitle":"An immersive event horizon simulation",
  "description":"Watch how matter spirals into the black hole as we explain accretion and collapse.",
  "steps":[...]
}

Focus on:
- astronomy: black_hole, solar_system
- biology: photosynthesis, cell_structure
- physics: gravity, electricity
- math: graphs, geometry
- programming: api_flow, algorithms
- history: timeline, comparison

Begin with a dramatic intro lesson packet, then build concept steps, interactive moments, and finish with a cinematic summary. Only emit structured JSON fields that the frontend can use. Do not return node coordinates, generic graph models, or markdown content.
`;
}
