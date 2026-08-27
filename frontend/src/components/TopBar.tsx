import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/lib/workspace";

interface Props {
  title: string;
  subtitle: string;
  onNewSpace: () => void;
  onSearch?: (q: string) => void;
  searchValue?: string;
}

export default function TopBar({ title, subtitle, onNewSpace, onSearch, searchValue }: Props) {
  const { activeSpace } = useWorkspace();
  const navigate = useNavigate();
  const [local, setLocal] = useState("");
  const value = searchValue ?? local;

  const scope = activeSpace ? `Search in ${activeSpace.name}` : "Search all Knowledge";

  return (
    <header
      className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-4"
      data-testid="top-bar"
    >
      <div className="min-w-0 flex-1">
        <h1 className="font-heading text-xl font-semibold" data-testid="page-title">
          {title}
        </h1>
        <p className="truncate text-sm text-muted-foreground" data-testid="page-subtitle">
          {subtitle}
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button size="sm" data-testid="new-button">
              <Plus className="size-4" />
              New
            </Button>
          }
        />
        <DropdownMenuContent align="end" data-testid="new-menu">
          <DropdownMenuItem
            onClick={() => navigate("/dashboard/knowledge?new=note")}
            data-testid="new-menu-note"
          >
            New Note
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/dashboard/tasks?new=1")}
            data-testid="new-menu-task"
          >
            New Task
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/dashboard/calendar?new=1")}
            data-testid="new-menu-event"
          >
            New Event
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onNewSpace} data-testid="new-menu-space">
            New Space
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/dashboard/voro")}
            data-testid="new-menu-voro"
          >
            Ask Voro
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="relative w-full max-w-[300px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={scope}
          value={value}
          onChange={(e) => {
            setLocal(e.target.value);
            onSearch?.(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !onSearch && value.trim()) {
              navigate(`/dashboard/knowledge?q=${encodeURIComponent(value.trim())}`);
            }
          }}
          data-testid="global-search-input"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        onClick={() => navigate("/dashboard/inbox")}
        data-testid="notifications-button"
      >
        <Bell className="size-4" />
      </Button>
    </header>
  );
}
