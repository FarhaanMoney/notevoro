/**
 * Notevoro Feature Registry
 * ------------------------------------------------------------------
 * Single source of truth for the "Tools" launcher, Quick Create menu,
 * Search-anywhere command bar, and any future feature-discovery UI.
 *
 * Adding a new feature to this file makes it discoverable in Tools,
 * Quick Create, and Search WITHOUT adding a new global sidebar item.
 *
 * NOTE: this is UI metadata only. The actual routes and permissions
 * are enforced by the existing backend + router (registry.py, App.js).
 * Do NOT duplicate route logic here.
 */

export const FEATURE_CATEGORIES = [
  { key: 'create',       label: 'Create',       hint: 'Blank objects to start writing, planning or capturing.' },
  { key: 'learn',        label: 'Learn',        hint: 'Study material, flashcards, quizzes and exam prep.' },
  { key: 'research',     label: 'Research',     hint: 'Sources, research projects and knowledge.' },
  { key: 'productivity', label: 'Productivity', hint: 'Plan, schedule and get work done.' },
  { key: 'capture',      label: 'Capture',      hint: 'Files, recordings and imports.' },
  { key: 'communicate',  label: 'Communicate',  hint: 'Chat, meetings and mail.' },
];

// Each feature entry has:
//   id            - stable key
//   name, desc    - user-facing copy
//   icon          - lucide name (via <Icon>)
//   category      - one of FEATURE_CATEGORIES
//   surfaces      - ['tools','vorohub','projects','create','search']
//   creatable     - shows up in Quick Create
//   inSpace       - route is a Space capability (needs current Space id)
//   route         - route template. Use {space} placeholder for Space-scoped
//   legacy        - deprecated global routes that should redirect here
//   plan          - min plan required (optional)
export const FEATURES = [
  // ---- Create -----------------------------------------------------
  { id: 'note',       name: 'Note',       desc: 'Fast, linkable notes with tags and backlinks.', icon: 'file-text',  category: 'create',       surfaces: ['tools','create'], creatable: true,  inSpace: true, route: '/dashboard/spaces/{space}/notes' },
  { id: 'page',       name: 'Page',       desc: 'Notion-styled nested pages with rich content.', icon: 'file-stack', category: 'create',       surfaces: ['tools','create'], creatable: true,  inSpace: true, route: '/dashboard/spaces/{space}/pages' },
  { id: 'document',   name: 'Document',   desc: 'Rich collaborative documents with version history.', icon: 'file', category: 'create',       surfaces: ['tools','create'], creatable: true,  inSpace: true, route: '/dashboard/spaces/{space}/documents' },
  { id: 'whiteboard', name: 'Whiteboard', desc: 'Visual canvas for ideas, diagrams and flows.', icon: 'pen-tool',   category: 'create',       surfaces: ['tools'],          creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/m/whiteboards' },
  { id: 'form',       name: 'Form',       desc: 'Collect structured input from anyone.',       icon: 'clipboard',  category: 'create',       surfaces: ['tools'],          creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/m/forms' },
  { id: 'dataset',    name: 'Dataset',    desc: 'Structured records with fields, views and filters.', icon: 'table', category: 'create',      surfaces: ['tools'],          creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/m/tables' },

  // ---- Learn ------------------------------------------------------
  { id: 'study_set',  name: 'Study Set',  desc: 'Everything you are studying about a topic in one place.', icon: 'graduation-cap', category: 'learn', surfaces: ['tools','vorohub'], creatable: true,  inSpace: true, route: '/dashboard/spaces/{space}/voro' },
  { id: 'flashcards', name: 'Flashcards', desc: 'Spaced-repetition flashcards from your material.', icon: 'layers-2', category: 'learn', surfaces: ['tools','vorohub'], creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/m/flashcards' },
  { id: 'quiz',       name: 'Quiz',       desc: 'Auto-generated quizzes to test yourself.',      icon: 'help-circle', category: 'learn', surfaces: ['tools','vorohub'], creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/m/quizzes' },
  { id: 'test',       name: 'Test',       desc: 'Full tests and exam simulations.',              icon: 'file-check',  category: 'learn', surfaces: ['tools','vorohub'], creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/m/tests' },
  { id: 'mind_map',   name: 'Mind Map',   desc: 'Visual concept map for a topic.',               icon: 'network',     category: 'learn', surfaces: ['tools','vorohub'], creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/m/mind_maps' },

  // ---- Research ---------------------------------------------------
  { id: 'research',   name: 'Research',   desc: 'Research projects with sources and synthesis.', icon: 'microscope',  category: 'research', surfaces: ['tools','vorohub'], creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/m/research' },
  { id: 'sources',    name: 'Sources',    desc: 'Collected sources with citations.',             icon: 'link',        category: 'research', surfaces: ['tools','vorohub'], creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/m/sources' },
  { id: 'knowledge',  name: 'Knowledge',  desc: 'Durable Space knowledge and references.',       icon: 'book-open',   category: 'research', surfaces: ['tools'],          creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/knowledge' },

  // ---- Productivity -----------------------------------------------
  { id: 'task',       name: 'Task',       desc: 'A single action with priority and due date.',   icon: 'check-square', category: 'productivity', surfaces: ['tools','create'], creatable: true, inSpace: true, route: '/dashboard/spaces/{space}/tasks' },
  { id: 'project',    name: 'Project',    desc: 'Group tasks, docs, meetings and decisions.',    icon: 'layers',       category: 'productivity', surfaces: ['tools','create'], creatable: true, inSpace: true, route: '/dashboard/spaces/{space}/projects' },
  { id: 'calendar',   name: 'Calendar',   desc: 'Events, deadlines and reminders.',              icon: 'calendar',     category: 'productivity', surfaces: ['tools'],          creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/calendar' },
  { id: 'meeting',    name: 'Meeting',    desc: 'Agenda, notes, decisions and follow-ups.',      icon: 'video',        category: 'productivity', surfaces: ['tools','create'], creatable: true, inSpace: true, route: '/dashboard/spaces/{space}/meetings' },
  { id: 'automation', name: 'Automations',desc: 'Triggers and actions across modules.',          icon: 'workflow',     category: 'productivity', surfaces: ['tools'],          creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/m/automations', plan: 'pro' },

  // ---- Capture ----------------------------------------------------
  { id: 'file',       name: 'Files',      desc: 'Upload, preview, and share files.',             icon: 'folder',       category: 'capture', surfaces: ['tools','create'], creatable: true,  inSpace: true, route: '/dashboard/spaces/{space}/files' },
  { id: 'transcribe', name: 'Transcriber',desc: 'Upload audio, get transcript, notes and tasks.',icon: 'mic',          category: 'capture', surfaces: ['tools'],          creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/tools/transcriber', plan: 'pro' },

  // ---- Communicate ------------------------------------------------
  { id: 'chat',       name: 'Chat',       desc: 'Direct messages and Team chat.',                icon: 'message-circle', category: 'communicate', surfaces: ['tools'], creatable: false, inSpace: true, route: '/dashboard/spaces/{space}/chat' },
  { id: 'inbox',      name: 'Inbox',      desc: 'Everything that needs your attention.',         icon: 'inbox',          category: 'communicate', surfaces: ['tools'], creatable: false, inSpace: false, route: '/dashboard/inbox' },
];

export function featuresByCategory() {
  const out = FEATURE_CATEGORIES.map((c) => ({ ...c, items: [] }));
  const byKey = Object.fromEntries(out.map((c) => [c.key, c]));
  FEATURES.forEach((f) => { if (byKey[f.category]) byKey[f.category].items.push(f); });
  return out;
}

export function creatableFeatures() {
  return FEATURES.filter((f) => f.creatable);
}

export function resolveRoute(feature, spaceId) {
  if (!feature.inSpace) return feature.route;
  if (!spaceId) return null;
  return feature.route.replace('{space}', spaceId);
}

// Legacy global-route redirects, kept minimal. Maps deprecated top-level
// routes to the modern in-Space equivalents (needs a Space id).
export const LEGACY_REDIRECTS = {
  '/dashboard/notes':      { feature: 'note' },
  '/dashboard/pages':      { feature: 'page' },
  '/dashboard/documents':  { feature: 'document' },
  '/dashboard/projects':   { feature: 'project' },
  '/dashboard/tasks':      { feature: 'task' },
  '/dashboard/calendar':   { feature: 'calendar' },
  '/dashboard/files':      { feature: 'file' },
  '/dashboard/meetings':   { feature: 'meeting' },
  '/dashboard/flashcards': { feature: 'flashcards' },
  '/dashboard/quizzes':    { feature: 'quiz' },
  '/dashboard/tests':      { feature: 'test' },
  '/dashboard/mind-maps':  { feature: 'mind_map' },
  '/dashboard/research':   { feature: 'research' },
};
