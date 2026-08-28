/**
 * Markdown + YAML frontmatter is the on-disk format, so every note stays readable and
 * editable in Obsidian, VS Code or any text editor. Deliberately a small, dependency-free
 * subset: strings, numbers, booleans, nulls and string arrays.
 */

export type FrontmatterValue = string | number | boolean | null | string[];
export type Frontmatter = Record<string, FrontmatterValue>;

export interface ParsedNote {
  frontmatter: Frontmatter;
  body: string;
}

const needsQuoting = (v: string) =>
  v === "" || /^[-?:,[\]{}#&*!|>'"%@`]/.test(v) || /[:#]\s/.test(v) || /\n/.test(v);

const encodeScalar = (v: FrontmatterValue): string => {
  if (v === null) return "null";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return `[${v.map((s) => encodeScalar(s)).join(", ")}]`;
  return needsQuoting(v) ? JSON.stringify(v) : v;
};

const decodeScalar = (raw: string): FrontmatterValue => {
  const v = raw.trim();
  if (v === "" || v === "null" || v === "~") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((s) => String(decodeScalar(s) ?? ""));
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    try {
      return JSON.parse(v.replace(/^'|'$/g, '"'));
    } catch {
      return v.slice(1, -1);
    }
  }
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
};

export function stringifyNote(frontmatter: Frontmatter, body: string): string {
  const lines = Object.entries(frontmatter)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${encodeScalar(v)}`);
  return `---\n${lines.join("\n")}\n---\n\n${body ?? ""}`;
}

export function parseNote(raw: string): ParsedNote {
  if (!raw.startsWith("---")) return { frontmatter: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: {}, body: raw };

  const head = raw.slice(raw.indexOf("\n") + 1, end);
  const body = raw.slice(end + 4).replace(/^\r?\n/, "");
  const frontmatter: Frontmatter = {};
  for (const line of head.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (key) frontmatter[key] = decodeScalar(line.slice(idx + 1));
  }
  return { frontmatter, body };
}

/* ------------------------------ typed accessors ----------------------------- */

export const fmString = (fm: Frontmatter, key: string, fallback = ""): string => {
  const v = fm[key];
  return typeof v === "string" ? v : v === null || v === undefined ? fallback : String(v);
};

export const fmNullableString = (fm: Frontmatter, key: string): string | null => {
  const v = fm[key];
  if (v === null || v === undefined || v === "") return null;
  return typeof v === "string" ? v : String(v);
};

export const fmStringArray = (fm: Frontmatter, key: string): string[] => {
  const v = fm[key];
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) return v.split(",").map((s) => s.trim());
  return [];
};
