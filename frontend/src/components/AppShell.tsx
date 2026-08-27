import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import GlobalSidebar from "@/components/GlobalSidebar";
import VoroPanel from "@/components/VoroPanel";
import CreateSpaceDialog from "@/components/CreateSpaceDialog";
import { NewSpaceContext } from "@/lib/newSpace";
import { useWorkspace } from "@/lib/workspace";
import { Loader2 } from "lucide-react";

export default function AppShell() {
  const { user, userLoading } = useWorkspace();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  if (userLoading) {
    return (
      <div className="grid h-screen place-items-center bg-background" data-testid="shell-loading">
        <Loader2 className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return (
    <NewSpaceContext.Provider value={{ openNewSpace: () => setOpen(true) }}>
      <div className="flex h-screen overflow-hidden bg-background" data-testid="app-shell">
        <GlobalSidebar onNewSpace={() => setOpen(true)} />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
        <VoroPanel />
        <CreateSpaceDialog open={open} onOpenChange={setOpen} />
      </div>
    </NewSpaceContext.Provider>
  );
}
