import type { TemplateId } from "@/types";

export interface SpaceTemplate {
  id: TemplateId;
  name: string;
  type: string;
  description: string;
  icon: string;
  color: string;
  /** Configuration, not code: modules are data so new templates need no new screens. */
  modules: string[];
  metrics: { key: string; label: string }[];
  suggestions: string[];
}

/**
 * Configuration-driven templates. Adding a template (or letting Voro generate
 * one) means appending a record here — never a new application.
 */
export const SPACE_TEMPLATES: SpaceTemplate[] = [
  {
    id: "student",
    name: "Student",
    type: "study",
    description: "Courses, notes, flashcards, quizzes, assignments and exams.",
    icon: "GraduationCap",
    color: "#8b5cf6",
    modules: [
      "Overview",
      "Knowledge",
      "Tasks",
      "Calendar",
      "Courses",
      "Notes",
      "Flashcards",
      "Quizzes",
      "Assignments",
      "Exams",
      "Progress",
    ],
    metrics: [
      { key: "eventsToday", label: "Classes Today" },
      { key: "tasksDue", label: "Tasks Due" },
      { key: "knowledge", label: "Notes" },
      { key: "completed", label: "Completed" },
    ],
    suggestions: [
      "Summarize my notes",
      "Create flashcards from my notes",
      "Quiz me on this topic",
      "Plan my study schedule",
    ],
  },
  {
    id: "educator",
    name: "Educator",
    type: "teaching",
    description: "Classes, students, grading, submissions and lesson materials.",
    icon: "Presentation",
    color: "#22d3ee",
    modules: [
      "Overview",
      "Knowledge",
      "Tasks",
      "Calendar",
      "Classes",
      "Students",
      "Assignments",
      "Grading",
      "Submissions",
      "Resources",
      "Progress",
    ],
    metrics: [
      { key: "eventsToday", label: "Classes Today" },
      { key: "tasksDue", label: "To Grade" },
      { key: "knowledge", label: "Materials" },
      { key: "completed", label: "Completed" },
    ],
    suggestions: [
      "Turn my lesson notes into a quiz",
      "Draft an assignment brief",
      "Summarize this material",
      "Plan next week's classes",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    type: "work",
    description: "Projects, documents, research, team and work tracking.",
    icon: "Rocket",
    color: "#f59e0b",
    modules: [
      "Overview",
      "Knowledge",
      "Tasks",
      "Calendar",
      "Projects",
      "Documents",
      "Research",
      "Team",
      "Analytics",
    ],
    metrics: [
      { key: "eventsToday", label: "Meetings Today" },
      { key: "tasksDue", label: "Tasks Due" },
      { key: "knowledge", label: "Documents" },
      { key: "completed", label: "Completed" },
    ],
    suggestions: [
      "Summarize this research doc",
      "Extract action items",
      "Draft a project brief",
      "Analyze my workload",
    ],
  },
  {
    id: "blank",
    name: "Blank",
    type: "custom",
    description: "Start empty and add only the modules you need.",
    icon: "Square",
    color: "#a3a3a3",
    modules: ["Overview", "Knowledge", "Tasks", "Calendar"],
    metrics: [
      { key: "eventsToday", label: "Events Today" },
      { key: "tasksDue", label: "Tasks Due" },
      { key: "knowledge", label: "Items" },
      { key: "completed", label: "Completed" },
    ],
    suggestions: ["Summarize my notes", "Plan my day", "Analyze my tasks"],
  },
];

export const getTemplate = (id: TemplateId): SpaceTemplate =>
  SPACE_TEMPLATES.find((t) => t.id === id) ?? SPACE_TEMPLATES[3];
