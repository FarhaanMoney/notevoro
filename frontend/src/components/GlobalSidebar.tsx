import { NavLink, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckSquare,
  Diamond,
  Inbox,
  LayoutGrid,
  LogOut,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace";
import { spaceIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const GLOBAL = [
  { to: "/dashboard/my-day", label: "My Day", icon: LayoutGrid, id: "my-day" },
  { to: "/dashboard/knowledge", label: "Knowledge", icon: Diamond, id: "knowledge" },
  { to: "/dashboard/tasks", label: "Tasks", icon: CheckSquare, id: "tasks" },
  { to: "/dashboard/calendar", label: "Calendar", icon: CalendarDays, id: "calendar" },
  { to: "/dashboard/voro", label: "Voro", icon: Sparkles, id: "voro" },
];

export default function GlobalSidebar({ onNewSpace }: { onNewSpace: () => void }) {
  const { user, spaces, activeSpaceId, setActiveSpaceId, logout } = useWorkspace();
  const navigate = useNavigate();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
      isActive
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
    );

  return (
    <aside
      className="flex h-full w-[236px] shrink-0 flex-col border-r border-border bg-sidebar"
      data-testid="global-sidebar"
    >
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="size-4" />
        </span>
        <span className="font-heading text-[17px] font-semibold tracking-tight">Notevoro</span>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {GLOBAL.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={linkClass}
            data-testid={`nav-${item.id}`}
          >
            <item.icon className="size-[17px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 flex items-center justify-between px-5 pb-1">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
          SPACES
        </span>
        <button
          type="button"
          onClick={onNewSpace}
          aria-label="Create a new Space"
          className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          data-testid="sidebar-new-space-button"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {spaces.length === 0 ? (
          <p className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            No Spaces yet. Create one to organise an area of your life or work.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {spaces.map((space) => {
              const Icon = spaceIcon(space.icon);
              const active = space.id === activeSpaceId;
              return (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => {
                    setActiveSpaceId(space.id);
                    navigate(`/dashboard/spaces/${space.id}`);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                  data-testid={`sidebar-space-${space.id}`}
                >
                  <Icon className="size-[17px]" style={{ color: space.color }} />
                  <span className="truncate">{space.name}</span>
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={onNewSpace}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          data-testid="sidebar-new-space-row"
        >
          <Plus className="size-[17px]" />
          New Space
        </button>
      </div>

      <div className="flex flex-col gap-1 border-t border-border px-3 py-3">
        <NavLink to="/dashboard/inbox" className={linkClass} data-testid="nav-inbox">
          <Inbox className="size-[17px]" />
          Inbox
        </NavLink>
        <NavLink to="/dashboard/settings" className={linkClass} data-testid="nav-settings">
          <SettingsIcon className="size-[17px]" />
          Settings
        </NavLink>
      </div>

      <div className="flex items-center gap-3 border-t border-border px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
          {(user?.name ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" data-testid="sidebar-user-name">
            {user?.name ?? "Signed out"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          aria-label="Sign out"
          className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          data-testid="sign-out-button"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
