import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { currentUser, signOut } from "@/lib/auth";
import { listSpaces } from "@/lib/spacesApi";
import { inboxCounts } from "@/lib/messagesApi";
import type { AuthUser, InboxCounts, Space } from "@/types";

type Theme = "light" | "dark" | "system";

interface WorkspaceValue {
  user: AuthUser | null;
  userLoading: boolean;
  spaces: Space[];
  spacesLoading: boolean;
  activeSpaceId: string | null;
  setActiveSpaceId: (id: string | null) => void;
  activeSpace: Space | null;
  counts: InboxCounts | null;
  theme: Theme;
  setTheme: (t: Theme) => void;
  refreshUser: () => void;
  logout: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

const THEME_KEY = "notevoro.theme";
const SPACE_KEY = "notevoro.activeSpace";

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(THEME_KEY) as Theme | null) ?? "dark",
  );
  const [activeSpaceId, setActive] = useState<string | null>(
    () => localStorage.getItem(SPACE_KEY),
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
  };

  const setActiveSpaceId = (id: string | null) => {
    if (id) localStorage.setItem(SPACE_KEY, id);
    else localStorage.removeItem(SPACE_KEY);
    setActive(id);
  };

  const userQuery = useQuery({ queryKey: ["auth", "me"], queryFn: currentUser, retry: false });
  const user = userQuery.data ?? null;

  const spacesQuery = useQuery({
    queryKey: ["spaces", user?.id],
    queryFn: listSpaces,
    enabled: Boolean(user),
  });
  const spaces = spacesQuery.data ?? [];

  // Light poll so an invitation or message that arrives elsewhere shows up without a reload.
  const countsQuery = useQuery({
    queryKey: ["inbox", "counts", user?.id],
    queryFn: inboxCounts,
    enabled: Boolean(user),
    refetchInterval: 12000,
  });

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? null,
    [spaces, activeSpaceId],
  );

  const value: WorkspaceValue = {
    user,
    userLoading: userQuery.isLoading,
    spaces,
    spacesLoading: spacesQuery.isLoading,
    activeSpaceId: activeSpace?.id ?? null,
    setActiveSpaceId,
    activeSpace,
    counts: countsQuery.data ?? null,
    theme,
    setTheme,
    refreshUser: () => void queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
    // Never hand-roll logout: clearing only the server session would leave the previous
    // account's react-query cache rendering for the next login in this browser.
    logout: async () => {
      try {
        await signOut();
      } finally {
        setActiveSpaceId(null);
        queryClient.clear();
      }
    },
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
