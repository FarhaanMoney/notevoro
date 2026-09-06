"""Canonical capability registry. Types: module | tool | view | ai | integration. Sidebar is derived from this."""

REG: list[dict] = []


def cap(key, name, type_, category, section, icon, desc, kind="records", plan=None, requires=None, default=False, fields=None):
    REG.append({"key": key, "name": name, "type": type_, "category": category, "section": section, "icon": icon,
                "description": desc, "kind": kind, "plan": plan, "requires": requires or [], "default": default, "fields": fields or []})


# ---- Core modules with dedicated engines
cap("notes", "Notes", "module", "Knowledge", "KNOWLEDGE", "file-text", "Fast, linkable notes with tags, pins and backlinks.", kind="notes", default=True)
cap("documents", "Documents", "module", "Knowledge", "KNOWLEDGE", "file", "Rich documents with version history and collaborative editing.", kind="documents")
cap("files", "Files", "module", "Knowledge", "KNOWLEDGE", "folder", "Upload, preview and share files. Large files live in S3.", kind="files")
cap("knowledge", "Knowledge Base", "module", "Knowledge", "KNOWLEDGE", "book-open", "Linked knowledge, references and semantic retrieval across the Space.", kind="knowledge")
cap("tasks", "Tasks", "module", "Productivity", "WORK", "check-square", "Tasks with priorities, due dates, assignees and projects.", kind="tasks", default=True)
cap("projects", "Projects", "module", "Project Management", "WORK", "layers", "Projects tying tasks, documents, meetings and goals together.", kind="projects")
cap("calendar", "Calendar", "module", "Productivity", "WORK", "calendar", "Events, deadlines, meetings and reminders.", kind="calendar")
cap("goals", "Goals", "module", "Productivity", "WORK", "target", "Outcome goals with progress tracking.", fields=["target", "progress"])
cap("meetings", "Meetings", "module", "Collaboration", "COLLABORATE", "video", "Agenda, attendees, notes, transcript and action items.", kind="meetings")
cap("chat", "Chat", "module", "Collaboration", "COLLABORATE", "message-circle", "Direct messages, group chats and the Space conversation.", kind="chat")
cap("inbox", "Inbox", "module", "Collaboration", "COLLABORATE", "inbox", "Mentions, assignments and unread messages in one place.", kind="inbox")
cap("team", "Team", "module", "Collaboration", "COLLABORATE", "users", "Members, roles, invitations and presence.", kind="team")

# ---- Knowledge (records)
for k, n, i, d in [("sources", "Sources", "link", "Collect sources with citations."), ("bookmarks", "Bookmarks", "bookmark", "Save links worth returning to."),
                   ("research", "Research", "microscope", "Research projects with questions, evidence and synthesis."), ("wiki", "Wiki", "book", "Team wiki pages."),
                   ("reading_list", "Reading List", "book-marked", "What to read next."), ("journal", "Journal", "notebook-pen", "Private daily journaling."),
                   ("daily_notes", "Daily Notes", "calendar-days", "A note for every day."), ("meeting_notes", "Meeting Notes", "clipboard-list", "Notes captured in meetings."),
                   ("documentation", "Documentation", "book-text", "Technical and product documentation."), ("sops", "SOPs", "list-ordered", "Standard operating procedures."),
                   ("policies", "Policies", "scale", "Policies and rules."), ("glossary", "Glossary", "spell-check", "Shared vocabulary."), ("archive", "Archive", "archive", "Archived items."),
                   ("web_clipper", "Web Clipper", "scissors", "Clip web content into the Space."), ("digital_garden", "Digital Garden", "sprout", "Evergreen ideas that grow.")]:
    cap(k, n, "module", "Knowledge", "KNOWLEDGE", i, d, fields=["url"] if k in ("sources", "bookmarks", "web_clipper") else [])

# ---- Productivity
for k, n, i, d, f in [("my_day", "My Day", "sun", "Today's focus list.", []), ("habits", "Habits", "repeat", "Track daily habits and streaks.", ["streak"]),
                      ("reminders", "Reminders", "bell", "Time-based reminders.", []), ("checklists", "Checklists", "list-checks", "Reusable checklists.", []),
                      ("milestones", "Milestones", "flag", "Key milestones across projects.", []), ("time_tracking", "Time Tracking", "timer", "Log time on work.", ["hours"]),
                      ("workload", "Workload", "gauge", "See who is carrying what.", []), ("eisenhower", "Eisenhower Matrix", "grid-2x2", "Urgent vs important.", ["quadrant"]),
                      ("weekly_review", "Weekly Review", "calendar-check", "Review the week.", []), ("routines", "Routines", "rotate-ccw", "Recurring routines.", [])]:
    cap(k, n, "module", "Productivity", "WORK", i, d, fields=f)

# ---- Project management
for k, n, i, d in [("roadmaps", "Roadmaps", "map", "Where the project is heading."), ("sprints", "Sprint Planning", "iteration-cw", "Plan and run sprints."),
                   ("backlog", "Backlog", "list", "Unscheduled work."), ("releases", "Releases", "rocket", "Ship and track releases."), ("issues", "Issues", "bug", "Bugs and issues."),
                   ("risks", "Risks", "alert-triangle", "Identified risks and mitigations."), ("decisions", "Decisions", "git-branch", "Decision log with rationale.")]:
    cap(k, n, "module", "Project Management", "WORK", i, d)

# ---- Learning
for k, n, i, d, f in [("courses", "Courses", "graduation-cap", "Courses you are taking or teaching.", ["instructor", "term"]), ("classes", "Classes", "school", "Class schedule and content.", ["room", "teacher"]),
                      ("subjects", "Subjects", "library", "Subjects across curricula (IGCSE, CBSE, ICSE, IB, JEE, NEET).", ["curriculum"]),
                      ("lessons", "Lessons", "presentation", "Lesson plans and content.", []), ("assignments", "Assignments", "clipboard-pen", "Assignments and homework with deadlines.", ["course", "grade"]),
                      ("quizzes", "Quizzes", "help-circle", "Quizzes and question sets.", ["questions", "score"]), ("tests", "Tests", "file-check", "Tests and exams.", ["score", "max_score"]),
                      ("question_banks", "Question Banks", "database", "Reusable question banks.", []), ("practice", "Practice", "dumbbell", "Practice sessions.", []), ("pyqs", "PYQs", "history", "Previous year questions.", ["year"]),
                      ("study_planner", "Study Planner", "calendar-range", "Plan study blocks.", ["duration"]), ("study_sessions", "Study Sessions", "hourglass", "Logged study sessions.", ["minutes"]),
                      ("flashcards", "Flashcards", "layers-2", "Spaced-repetition flashcards.", ["front", "back"]), ("mind_maps", "Mind Maps", "network", "Visual idea maps.", []),
                      ("progress", "Progress", "trending-up", "Learning progress.", ["percent"]), ("grade_tracker", "Grade Tracker", "award", "Track grades over time.", ["grade", "weight"]),
                      ("exam_tracker", "Exam Tracker", "calendar-clock", "Upcoming exams.", ["subject"]), ("revision_planner", "Revision Planner", "refresh-cw", "Revision cycles.", []),
                      ("mistake_book", "Mistake Book", "x-circle", "Learn from mistakes.", ["correction"]), ("formula_sheet", "Formula Sheet", "sigma", "Formulas by topic.", ["formula"]),
                      ("learning_goals", "Learning Goals", "target", "What you want to learn.", [])]:
    cap(k, n, "module", "Learning", "LEARNING", i, d, fields=f)

# ---- Collaboration extras
for k, n, i, d in [("announcements", "Announcements", "megaphone", "Space-wide announcements."), ("discussions", "Discussions", "messages-square", "Threaded discussions."),
                   ("approvals", "Approvals", "check-check", "Request and grant approvals."), ("whiteboards", "Whiteboards", "pen-tool", "Shared visual whiteboards."),
                   ("activity", "Activity Feed", "activity", "Everything happening in this Space.")]:
    cap(k, n, "module", "Collaboration", "COLLABORATE", i, d, kind="activity" if k == "activity" else "records")

# ---- Data
for k, n, i, d in [("tables", "Tables", "table", "Structured tables with custom fields."), ("trackers", "Trackers", "list-todo", "Track anything over time."),
                   ("forms", "Forms", "clipboard", "Collect structured input."), ("charts", "Charts", "bar-chart-3", "Visualize your data.")]:
    cap(k, n, "module", "Data", "DATA", i, d)

# ---- Automation
cap("automations", "Automations", "module", "Automation", "WORK", "workflow", "Triggers and actions across modules. Consequential actions ask first.", plan="pro")

# ---- Tools
for k, n, i, d in [("pomodoro", "Pomodoro", "timer", "Focused work intervals."), ("calculator", "Calculator", "calculator", "Quick calculations."),
                   ("converter", "Converter", "arrow-left-right", "Convert units and currencies."), ("focus_mode", "Focus Mode", "eye", "Hide everything but the work."),
                   ("transcriber", "Transcriber", "mic", "Upload audio, get a searchable transcript with action items."), ("timer", "Timer", "alarm-clock", "Simple countdown timer.")]:
    cap(k, n, "tool", "Tools", "TOOLS", i, d, kind="tool", plan="pro" if k == "transcriber" else None)

# ---- Views (representations of the same tasks/projects data)
for k, n, i, d in [("board", "Board", "kanban", "Kanban board of tasks by status."), ("timeline", "Timeline", "gantt-chart", "Tasks and projects on a timeline."),
                   ("table_view", "Table", "table-2", "Dense table of tasks."), ("gallery", "Gallery", "layout-grid", "Cards gallery of notes and documents."),
                   ("calendar_view", "Calendar View", "calendar", "Tasks and events on a calendar."), ("gantt", "Gantt", "bar-chart-horizontal", "Dependencies over time.")]:
    cap(k, n, "view", "Views", "VIEWS", i, d, kind="view")

# ---- AI capabilities
for k, n, i, d, adv in [("ai_writer", "AI Writer", "pen-line", "Draft and rewrite content.", False), ("ai_summarizer", "AI Summarizer", "align-left", "Summaries of notes, docs and meetings.", False),
                        ("ai_research", "AI Research", "search", "Research assistance with sources.", True), ("ai_tutor", "AI Tutor", "graduation-cap", "Prof Atlas explains and quizzes you.", False),
                        ("ai_quiz", "AI Quiz Generator", "help-circle", "Generate quizzes from your notes.", False), ("ai_flashcards", "AI Flashcard Generator", "layers-2", "Turn material into flashcards.", False),
                        ("ai_study_planner", "AI Study Planner", "calendar-range", "Plan study around exams.", False), ("ai_meeting", "AI Meeting Assistant", "video", "Notes and action items from transcripts.", True),
                        ("ai_task", "AI Task Assistant", "check-square", "Astra turns intent into tasks.", False), ("ai_project", "AI Project Assistant", "layers", "Plans, risks and status for projects.", True),
                        ("ai_brainstorm", "AI Brainstormer", "lightbulb", "Divergent idea generation.", False), ("ai_translator", "AI Translator", "languages", "Translate content.", False),
                        ("ai_code", "AI Code Assistant", "code", "Code help in context.", True), ("ai_knowledge", "AI Knowledge Assistant", "brain", "Answer questions across your knowledge.", True)]:
    cap(k, n, "ai", "AI", "AI", i, d, kind="ai", plan="pro" if adv else None)

# ---- Integrations (connections, not sidebar items)
for k, n, i, d in [("google", "Google Workspace", "mail", "Drive, Docs, Calendar and Meet."), ("microsoft", "Microsoft 365", "briefcase", "Calendar, Teams and OneDrive."),
                   ("zoom", "Zoom", "video", "Schedule and join Zoom meetings from Meetings."), ("dropbox", "Dropbox", "cloud", "Attach files from Dropbox.")]:
    cap(k, n, "integration", "Integrations", "INTEGRATIONS", i, d, kind="integration", plan="pro")

BY_KEY = {c["key"]: c for c in REG}
SECTION_ORDER = ["WORK", "LEARNING", "KNOWLEDGE", "COLLABORATE", "DATA", "TOOLS", "VIEWS"]
DEFAULT_PERSONAL = ["notes", "tasks", "calendar", "projects", "goals", "documents", "files"]
DEFAULT_TEAM = ["notes", "tasks", "calendar", "projects", "goals", "documents", "files", "knowledge", "chat", "meetings", "team", "board", "timeline", "table_view"]


def sidebar_for(keys: list[str], order: list[str] | None = None):
    enabled = [BY_KEY[k] for k in (order or keys) if k in BY_KEY and k in keys]
    for k in keys:
        if k in BY_KEY and BY_KEY[k] not in enabled:
            enabled.append(BY_KEY[k])
    sections = {}
    for c in enabled:
        if c["type"] in ("ai", "integration"):
            continue
        sections.setdefault(c["section"], []).append({k: c[k] for k in ("key", "name", "icon", "type", "kind")})
    return [{"section": s, "items": sections[s]} for s in SECTION_ORDER if s in sections]
