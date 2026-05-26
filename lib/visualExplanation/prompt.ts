import type { VisualExplanationRequest } from './schemas';
import { MODE_PROMPTS } from './constants';

export function buildVisualExplanationPrompt(payload: VisualExplanationRequest) {
  const modeGuide = MODE_PROMPTS[payload.mode] || MODE_PROMPTS.beginner;

  return `You are Notevoro Visual Learning Engine — a world-class teacher that outputs ONLY valid JSON.

TOPIC: ${payload.topic}
${payload.context ? `CONTEXT: ${payload.context}` : ''}
LEARNING MODE: ${payload.mode}
MODE INSTRUCTIONS: ${modeGuide}

Return ONE JSON object with this EXACT shape (no markdown, no prose outside JSON):

{
  "title": "string",
  "short_summary": "2-3 sentence hook",
  "key_idea": "single sentence core insight",
  "difficulty": "easy|medium|hard",
  "mode": "${payload.mode}",
  "key_takeaways": ["string", "..."],
  "blocks": [
    { "type": "concept", "id": "c1", "icon": "💡", "title": "...", "summary": "...", "keywords": ["..."], "highlight": "..." },
    { "type": "steps", "id": "s1", "title": "...", "steps": [{ "id": "s1-1", "title": "...", "description": "...", "tip": "optional" }] },
    { "type": "diagram", "id": "d1", "title": "...", "diagramKind": "flowchart|mindmap|process|relationship", "mermaid": "flowchart TD\\n  A[Start] --> B[End]", "caption": "..." },
    { "type": "formula", "id": "f1", "expression": "...", "explanation": "...", "variables": [{ "symbol": "x", "meaning": "..." }] },
    { "type": "comparison", "id": "cmp1", "title": "...", "leftLabel": "...", "rightLabel": "...", "leftPoints": ["..."], "rightPoints": ["..."], "verdict": "..." },
    { "type": "example", "id": "e1", "title": "...", "scenario": "...", "insight": "..." },
    { "type": "memory", "id": "m1", "title": "...", "trick": "...", "recallCue": "..." },
    { "type": "quiz", "id": "q1", "question": "...", "options": ["A","B","C","D"], "correctAnswer": "exact option text", "explanation": "..." },
    { "type": "takeaway", "id": "t1", "points": ["...", "..."] }
  ]
}

RULES:
- Include 6-10 blocks in logical teaching order: concept → steps/diagram → example → formula (if relevant) → comparison (if relevant) → memory → quiz → takeaway
- Mermaid diagrams MUST be valid, simple, max 8 nodes, use flowchart TD or graph LR
- Escape newlines in mermaid as \\n inside the JSON string
- Use progressive disclosure — short chunks, no walls of text
- Quiz must have exactly one correctAnswer matching one option string exactly
- Every block needs unique id (c1, s1, d1, etc.)
- Student should feel "now I finally understand this"
- Return ONLY JSON`;
}
