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
  return `You are an educational AI. You must output one valid JSON object only, with no markdown, no code fences, no text outside the JSON, and no partial JSON fragments.

Return an object with this exact structure:
{
  "title": "Lesson Title",
  "description": "Short lesson summary",
  "slides": [
    {
      "id": "slide-1",
      "title": "Slide Title",
      "content": "Educational explanation",
      "visualType": "diagram",
      "visualPrompt": "Detailed educational visual generation prompt",
      "bulletPoints": ["Point 1", "Point 2"]
    }
  ]
}

Rules:
- title is REQUIRED
- description is REQUIRED
- slides is REQUIRED and must be an array of 3 to 8 slides
- every slide must include id, title, content, visualType, visualPrompt, and bulletPoints
- bulletPoints must be an array of strings
- do not include any additional fields outside the schema
- do not use markdown, comments, or any explanatory text
- do not stream fragments, only output the complete JSON object
- keep the lesson educational, visual, and concise

Topic: "${topic}"
Subject: "${subject}"
Level: "${level}"
`;
}
