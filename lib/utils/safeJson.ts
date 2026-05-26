/**
 * Safe JSON utilities — never throw on cyclic structures.
 */

export function safeStringify(
  value: unknown,
  space?: number
): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_key, val) => {
        if (val !== null && typeof val === 'object') {
          if (seen.has(val as object)) return '[Circular]';
          seen.add(val as object);
        }
        if (typeof val === 'bigint') return val.toString();
        if (typeof val === 'function') return undefined;
        if (val instanceof Error) return { message: val.message, name: val.name };
        return val;
      },
      space
    );
  } catch {
    return '{"error":"Unable to serialize value"}';
  }
}

export function safeParseJSON<T = unknown>(text: string): T | null {
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    const match = cleaned.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : cleaned) as T;
  } catch {
    return null;
  }
}

export function sanitizeForApi<T extends Record<string, unknown>>(obj: T): T {
  return JSON.parse(safeStringify(obj)) as T;
}
