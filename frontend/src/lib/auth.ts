import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { ApiMessage, AuthUser } from "@/types";

/**
 * Auth provider abstraction.
 *
 * Identity now lives on the server behind an httpOnly session cookie, because Space
 * membership, invitations and messaging are inherently multi-user. Personal workspace
 * data (tasks, knowledge, calendar, Voro chats) stays local-first in IndexedDB.
 *
 * Supabase Auth drops in here: when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set,
 * `activeProvider()` reports supabase and only these five functions change.
 */
export const supabaseConfig = {
  url: (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "",
  anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "",
};

export const supabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

export const activeProvider = (): "supabase" | "notevoro" =>
  supabaseConfigured ? "supabase" : "notevoro";

export const apiErrorMessage = (err: unknown, fallback = "Something went wrong."): string => {
  if (err instanceof ApiError) {
    const body = err.body as { detail?: unknown } | null;
    if (body && typeof body.detail === "string") return body.detail;
    if (body && Array.isArray(body.detail)) {
      const first = body.detail[0] as { msg?: string } | undefined;
      if (first?.msg) return first.msg;
    }
  }
  return err instanceof Error && err.message !== "Failed to fetch" ? err.message : fallback;
};

export const signUp = (name: string, email: string, password: string) =>
  apiPost<AuthUser>("/auth/signup", { name, email, password });

export const signIn = (email: string, password: string) =>
  apiPost<AuthUser>("/auth/login", { email, password });

export const requestPasswordReset = async (email: string): Promise<string> => {
  const res = await apiPost<ApiMessage>("/auth/recover", { email });
  return res.message;
};

export async function currentUser(): Promise<AuthUser | null> {
  try {
    return await apiGet<AuthUser>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export const signOut = () => apiPost<ApiMessage>("/auth/logout");

export const searchDirectory = (q: string) =>
  apiGet<AuthUser[]>(`/auth/directory?q=${encodeURIComponent(q)}`);
