import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { currentUser, signOut } from "@/lib/auth";
import { spacesRepository } from "@/lib/repositories";
import { inboxCounts } from "@/lib/messagesApi";
import { migrateLegacyDataToVault } from "@/lib/repo";
import { vault, vaultKind } from "@/lib/vault";
import type { AuthUser, Space, InboxCounts } from "@/types";

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
  vaultKind: "browser" | "tauri";
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
    queryFn: () => spacesRepository.listSpaces(),
    enabled: Boolean(user),
  });
  const localSpaces = spacesQuery.data ?? [];

  // Convert LocalSpace to Space for compatibility with existing UI
  const spaces: Space[] = localSpaces.map(ls => ({
    id: ls.id,
    ownerId: ls.userId,
    name: ls.name,
    templateId: ls.template as any,
    icon: "📁",
    color: "blue",
    modules: [],
    createdAt: ls.createdAt,
    role: "owner" as any,
  }));

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

  // Move any pre-vault records into Markdown files, once.
  useEffect(() => {
    if (!user) return;
    void migrateLegacyDataToVault(user.id).then((moved) => {
      if (moved > 0) {
        void queryClient.invalidateQueries({ queryKey: ["tasks"] });
        void queryClient.invalidateQueries({ queryKey: ["events"] });
        void queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      }
    });
  }, [user, queryClient]);

  // External vault edits (Obsidian, VS Code, git pull) must show up live. The browser
  // adapter has nothing to watch, so this is a no-op there and real under Tauri.
  useEffect(() => {
    let dispose: (() => void) | undefined;
    void vault()
      .watch(() => {
        void queryClient.invalidateQueries({ queryKey: ["tasks"] });
        void queryClient.invalidateQueries({ queryKey: ["events"] });
        void queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      })
      .then((off) => {
        dispose = off;
      });
    return () => dispose?.();
  }, [queryClient]);

  const value: WorkspaceValue = {
    user,
    userLoading: userQuery.isLoading,
    spaces,
    spacesLoading: spacesQuery.isLoading,
    activeSpaceId: activeSpace?.id ?? null,
    setActiveSpaceId,
    activeSpace,
    counts: countsQuery.data ?? null,
    vaultKind: vaultKind(),
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
