import type { ApiMessage, AuthUser } from "@/types";

/**
 * Supabase Auth - The ONLY authentication system for Notevoro.
 *
 * User identity comes from Supabase auth.users.id (Supabase UUID).
 * This is the authoritative user ID throughout the application.
 * 
 * Personal workspace data (tasks, knowledge, calendar, Voro chats) stays local-first
 * in the vault (IndexedDB for web, local filesystem for desktop).
 * 
 * Cloud collaboration features (Spaces, messaging, presence) use the backend,
 * but authentication itself happens directly through Supabase Auth.
 */

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL as string,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
};

// Validate Supabase configuration
if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  throw new Error(
    "Supabase is required. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables."
  );
}

// Supabase client initialization (lazy load)
let supabaseClient: any = null;

async function getSupabaseClient() {
  if (!supabaseClient) {
    const { createClient } = await import('@supabase/supabase-js');
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  }
  return supabaseClient;
}

export const signUp = async (name: string, email: string, password: string) => {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  });
  
  if (error) {
    // Provide user-friendly error messages
    if (error.message.includes("already registered")) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }
    if (error.message.includes("weak password")) {
      throw new Error("Password is too weak. Please use a stronger password.");
    }
    throw error;
  }
  
  return {
    id: data.user?.id,
    email: data.user?.email,
    name: data.user?.user_metadata?.name || name,
    created_at: data.user?.created_at
  } as AuthUser;
};

export const signIn = async (email: string, password: string) => {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    // Provide user-friendly error messages
    if (error.message.includes("Invalid login credentials")) {
      throw new Error("Invalid email or password. Please try again.");
    }
    if (error.message.includes("Email not confirmed")) {
      throw new Error("Please confirm your email address before signing in.");
    }
    throw error;
  }
  
  return {
    id: data.user?.id,
    email: data.user?.email,
    name: data.user?.user_metadata?.name || email.split('@')[0],
    created_at: data.user?.created_at
  } as AuthUser;
};

export const requestPasswordReset = async (email: string): Promise<string> => {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  
  if (error) {
    throw new Error("Unable to send password reset email. Please try again.");
  }
  
  return "If an account exists for that address, a recovery link will be sent.";
};

export async function currentUser(): Promise<AuthUser | null> {
  const supabase = await getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.email?.split('@')[0] || '',
    created_at: user.created_at
  } as AuthUser;
}

export const signOut = async () => {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    throw new Error("Unable to sign out. Please try again.");
  }
  
  return { message: "Signed out" } as ApiMessage;
};

export const searchDirectory = (q: string) => {
  // User directory is a backend-specific feature for cloud collaboration
  // Return empty array for now - this would require backend with MongoDB
  return Promise.resolve([] as AuthUser[]);
};

// Error message helper for user-friendly error display
export const apiErrorMessage = (err: unknown, fallback = "Something went wrong."): string => {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") return err;
  return fallback;
};

// Export for use in api.ts
export async function getSupabaseSession() {
  const supabase = await getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
