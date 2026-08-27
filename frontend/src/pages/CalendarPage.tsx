import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TopBar from "@/components/TopBar";
import { EmptyState } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace";
import { useNewSpace } from "@/lib/newSpace";
import { createEvent, deleteEvent, listEvents, listTasks, todayIso, updateEvent } from "@/lib/repo";
import type { CalendarEvent } from "@/types";
import { cn } from "@/lib/utils";

const monthLabel = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "long", year: "numeric" });

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

interface Props {
  spaceId?: string;
  embedded?: boolean;
}

export default function CalendarPage({ spaceId, embedded }: Props) {
  const { user, spaces, activeSpaceId } = useWorkspace();
  const { openNewSpace } = useNewSpace();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [anchor, setAnchor] = useState(new Date());
  const [view, setView] = useState("month");
  const [showForm, setShowForm] = useState(params.get("new") === "1");
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayIso());
  const [time, setTime] = useState("09:00");
  const [location, setLocation] = useState("");
  const [target, setTarget] = useState<string>(spaceId ?? activeSpaceId ?? "none");
  const [filter, setFilter] = useState<string>("all");

  const scope = spaceId ?? null;
  const eventsQuery = useQuery({
    queryKey: ["events", user?.id, scope ?? "all"],
    queryFn: () => listEvents(user!.id, scope),
    enabled: Boolean(user),
  });
  const tasksQuery = useQuery({
    queryKey: ["tasks", user?.id, scope ?? "all"],
    queryFn: () => listTasks(user!.id, scope),
    enabled: Boolean(user),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return updateEvent({ ...editing, title, date, time, location });
      }
      return createEvent({
        userId: user!.id,
        spaceId: spaceId ?? (target === "none" ? null : target),
        title,
        date,
        time,
        location,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success(editing ? "Event updated" : "Event created");
      setEditing(null);
      setTitle("");
      setLocation("");
    },
    onError: () => toast.error("Could not save event"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      invalidate();
      toast.success("Event deleted");
    },
  });

  const allEvents = (eventsQuery.data ?? []).filter(
    (e) => filter === "all" || e.spaceId === filter,
  );
  const deadlines = (tasksQuery.data ?? []).filter(
    (t) => t.dueDate && t.status === "open" && (filter === "all" || t.spaceId === filter),
  );

  const grid = useMemo(() => monthGrid(anchor), [anchor]);
  const spaceColor = (id: string | null) => spaces.find((s) => s.id === id)?.color ?? "#8b5cf6";
  const spaceName = (id: string | null) => spaces.find((s) => s.id === id)?.name ?? "No Space";
  const today = todayIso();

  const startEdit = (e: CalendarEvent) => {
    setEditing(e);
    setTitle(e.title);
    setDate(e.date);
    setTime(e.time);
    setLocation(e.location);
    setShowForm(true);
  };

  const body = (
    <div className={cn("flex-1 overflow-y-auto", embedded ? "" : "p-6")} data-testid="calendar-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))}
            data-testid="calendar-prev-button"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-heading text-base font-semibold" data-testid="calendar-month-label">
            {monthLabel(anchor)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next month"
            onClick={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))}
            data-testid="calendar-next-button"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAnchor(new Date())} data-testid="calendar-today-button">
            Today
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!spaceId && (
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[170px]" size="sm" data-testid="calendar-space-filter">
                <SelectValue>
                  {(v) => (v === "all" ? "All Spaces" : spaceName(v as string))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Spaces</SelectItem>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Tabs value={view} onValueChange={setView}>
            <TabsList variant="line" data-testid="calendar-view-tabs">
              <TabsTrigger value="month" data-testid="calendar-view-month">Month</TabsTrigger>
              <TabsTrigger value="agenda" data-testid="calendar-view-agenda">Agenda</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => setShowForm((v) => !v)} data-testid="calendar-toggle-form-button">
            <Plus className="size-4" />
            New Event
          </Button>
        </div>
      </div>

      {showForm && (
        <form
          className="nv-panel mt-4 flex animate-fade-up flex-wrap items-end gap-3 rounded-xl p-4"
          data-testid="event-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) save.mutate();
          }}
        >
          <div className="min-w-[200px] flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              data-testid="event-title-input"
            />
          </div>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[150px]" data-testid="event-date-input" />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-[120px]" data-testid="event-time-input" />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            className="w-[180px]"
            data-testid="event-location-input"
          />
          {!spaceId && !editing && (
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="w-[160px]" data-testid="event-space-select">
                <SelectValue>{(v) => (v === "none" ? "No Space" : spaceName(v as string))}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Space</SelectItem>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="submit" disabled={!title.trim() || save.isPending} data-testid="event-submit-button">
            {editing ? "Save changes" : "Add Event"}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setTitle("");
              }}
              data-testid="event-cancel-edit-button"
            >
              Cancel
            </Button>
          )}
        </form>
      )}

      {view === "month" ? (
        <div className="nv-panel mt-4 overflow-hidden rounded-2xl" data-testid="calendar-month-grid">
          <div className="grid grid-cols-7 border-b border-border">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d} className="px-3 py-2 text-[11px] text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {grid.map((day) => {
              const iso = toIso(day);
              const inMonth = day.getMonth() === anchor.getMonth();
              const dayEvents = allEvents.filter((e) => e.date === iso);
              const dayTasks = deadlines.filter((t) => t.dueDate === iso);
              return (
                <div
                  key={iso}
                  className={cn(
                    "min-h-[92px] border-b border-r border-border p-1.5",
                    !inMonth && "opacity-40",
                  )}
                  data-testid={`calendar-day-${iso}`}
                >
                  <span
                    className={cn(
                      "inline-grid size-6 place-items-center rounded-md text-[11px]",
                      iso === today ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="mt-1 flex flex-col gap-1">
                    {dayEvents.slice(0, 2).map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => startEdit(e)}
                        className="truncate rounded px-1.5 py-0.5 text-left text-[10px]"
                        style={{
                          background: `color-mix(in oklab, ${spaceColor(e.spaceId)} 22%, transparent)`,
                          color: spaceColor(e.spaceId),
                        }}
                        data-testid={`calendar-event-${e.id}`}
                      >
                        {e.time} {e.title}
                      </button>
                    ))}
                    {dayTasks.slice(0, 1).map((t) => (
                      <span
                        key={t.id}
                        className="truncate rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        data-testid={`calendar-deadline-${t.id}`}
                      >
                        ⏱ {t.title}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2" data-testid="calendar-agenda">
          {allEvents.length === 0 ? (
            <EmptyState
              title="No events yet"
              body="Create an event and it appears in the month grid, the agenda, and in My Day on its date."
              testId="calendar-empty-state"
            />
          ) : (
            allEvents.map((e) => (
              <div
                key={e.id}
                className="nv-panel nv-hover-card flex items-center gap-3 rounded-xl px-4 py-3"
                data-testid={`agenda-event-${e.id}`}
              >
                <span className="w-[92px] text-xs text-muted-foreground">{e.date}</span>
                <span className="w-14 text-xs text-primary">{e.time}</span>
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm"
                  onClick={() => startEdit(e)}
                  data-testid={`agenda-edit-${e.id}`}
                >
                  {e.title}
                </button>
                {!spaceId && (
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                    {spaceName(e.spaceId)}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Delete ${e.title}`}
                  onClick={() => remove.mutate(e.id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  data-testid={`agenda-delete-${e.id}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <>
      <TopBar
        title="Calendar"
        subtitle="Your schedule across all Spaces"
        onNewSpace={openNewSpace}
      />
      {body}
    </>
  );
}
