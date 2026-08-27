import {
  Boxes,
  GraduationCap,
  Home,
  Presentation,
  Rocket,
  Square,
  Briefcase,
  Heart,
  FlaskConical,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  GraduationCap,
  Presentation,
  Rocket,
  Square,
  Home,
  Briefcase,
  Heart,
  FlaskConical,
  BookOpen,
  Boxes,
};

export const spaceIcon = (name: string): LucideIcon => ICONS[name] ?? Boxes;
