import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { currentUser, signOut as authSignOut } from "@/lib/auth";
import { listSpaces } from "@/lib/repo";
import type { AuthUser, Space } from "@/types";

type Theme = "light" | "dark" | "system";

interface WorkspaceValue {
  user: AuthUser | null;
  userLoading: boolean;
  spaces: Space[];
  spacesLoading: boolean;
  activeSpaceId: string | null;
  setActiveSpaceId: (id: string | null) => void;
  activeSpace: Space | null;
  theme: Theme;
  setTheme: (t: Theme) => void;
  refreshUser: () => void;
  logout: () => void;
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

  const userQuery = useQuery({ queryKey: ["auth", "me"], queryFn: currentUser });
  const user = userQuery.data ?? null;

  const spacesQuery = useQuery({
    queryKey: ["spaces", user?.id],
    queryFn: () => listSpaces(user!.id),
    enabled: Boolean(user),
  });
  const spaces = spacesQuery.data ?? [];

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
    theme,
    setTheme,
    refreshUser: () => void queryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
    logout: () => {
      authSignOut();
      setActiveSpaceId(null);
      queryClient.clear();
    },
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
