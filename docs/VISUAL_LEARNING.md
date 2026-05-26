# Notevoro Visual Learning Engine

## Architecture

```
app/api/visual-explanation/generate/route.js
  └── lib/visualExplanation/service.ts      # Auth, energy, OpenAI
        ├── prompt.ts                       # Mode-aware prompts
        ├── parser.ts                       # JSON → canonical blocks
        ├── types.ts + schemas.ts           # Zod validation
        └── constants.ts                    # Modes + energy costs

components/visual-learning/
  ├── VisualLearningStudio.jsx              # Main UI
  ├── LearningExperience.jsx                # Rendered lesson
  ├── BlockRenderer.jsx                     # Block router
  ├── blocks/*                              # 9 interactive block types
  ├── MermaidDiagram.jsx                    # SVG diagrams
  └── VisualLearningErrorBoundary.jsx

hooks/useVisualLearning.js
lib/utils/safeJson.ts                       # Cyclic-safe serialization
```

## Learning modes

| Mode | Energy cost |
|------|-------------|
| quick | 8 |
| beginner | 12 |
| exam | 14 |
| advanced | 15 |
| deep | 20 |

## Example AI response (truncated)

```json
{
  "title": "Photosynthesis Explained",
  "short_summary": "Plants capture light and store it as chemical energy.",
  "key_idea": "Light energy drives glucose formation from CO₂ and water.",
  "difficulty": "medium",
  "mode": "beginner",
  "blocks": [
    { "type": "concept", "id": "c1", "icon": "🌿", "title": "The Big Picture", "summary": "...", "keywords": ["chlorophyll"] },
    { "type": "diagram", "id": "d1", "title": "Energy Flow", "diagramKind": "flowchart", "mermaid": "flowchart TD\\n  A[Light] --> B[Chloroplast]\\n  B --> C[Glucose]" },
    { "type": "quiz", "id": "q1", "question": "...", "options": ["Oxygen", "Nitrogen"], "correctAnswer": "Oxygen", "explanation": "..." }
  ],
  "key_takeaways": ["Light is the input", "Oxygen is a byproduct"]
}
```

## Env

- `OPENAI_API_KEY` (required)
- `OPENAI_MODEL` (optional, default `gpt-4o-mini`)

## Deploy

1. `npm install` (includes `framer-motion`, `mermaid`)
2. Deploy to Vercel
3. Pro/Premium/trial required for access

## Safety

- `safeStringify` for all client POST bodies
- `coerceVisualExplanationTopic` prevents event objects in chat
- Error boundary around rendered lessons
- Energy refunded on generation failure
