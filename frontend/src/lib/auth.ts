import { get, all, put, newId } from "@/lib/idb";
import type { AuthUser, User } from "@/types";

/**
 * Auth provider abstraction.
 *
 * `supabase` is the intended provider: the moment VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY are present in the environment, `activeProvider()`
 * reports "supabase" and Settings shows it as live. Until those env vars are
 * filled, a local provider keeps the app fully usable — identities live in
 * IndexedDB alongside the rest of the local-first workspace data.
 */
const SESSION_KEY = "notevoro.session";

export const supabaseConfig = {
  url: (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "",
  anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "",
};

export const supabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

export const activeProvider = (): "supabase" | "local" =>
  supabaseConfigured ? "supabase" : "local";

async function hash(password: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const toAuthUser = (u: User): AuthUser => ({ id: u.id, email: u.email, name: u.name });

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  const normalized = email.trim().toLowerCase();
  if (!name.trim()) throw new Error("Please enter your name.");
  if (!normalized.includes("@")) throw new Error("Please enter a valid email address.");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const users = await all<User>("users");
  if (users.some((u) => u.email === normalized)) {
    throw new Error("An account with that email already exists. Try signing in.");
  }
  const user: User = {
    id: newId(),
    email: normalized,
    name: name.trim(),
    passwordHash: await hash(password),
    createdAt: new Date().toISOString(),
  };
  await put("users", user);
  localStorage.setItem(SESSION_KEY, user.id);
  return toAuthUser(user);
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const normalized = email.trim().toLowerCase();
  const users = await all<User>("users");
  const user = users.find((u) => u.email === normalized);
  if (!user || user.passwordHash !== (await hash(password))) {
    throw new Error("Incorrect email or password.");
  }
  localStorage.setItem(SESSION_KEY, user.id);
  return toAuthUser(user);
}

export async function requestPasswordReset(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const users = await all<User>("users");
  if (!users.some((u) => u.email === normalized)) {
    throw new Error("No account found for that email.");
  }
  return activeProvider() === "supabase"
    ? "A recovery link has been sent to your inbox."
    : "Recovery emails require the Supabase provider. Add your Supabase env vars to enable them.";
}

export async function currentUser(): Promise<AuthUser | null> {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const user = await get<User>("users", id);
  return user ? toAuthUser(user) : null;
}

export function signOut(): void {
  localStorage.removeItem(SESSION_KEY);
}
