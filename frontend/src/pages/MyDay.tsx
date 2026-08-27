import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarDays, CheckCircle2, Diamond, ListChecks } from "lucide-react";
import TopBar from "@/components/TopBar";
import { MetricCard, EmptyState } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/lib/workspace";
import { useNewSpace } from "@/lib/newSpace";
import { listEvents, listKnowledge, listTasks, todayIso } from "@/lib/repo";
import { spaceIcon } from "@/components/icons";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export default function MyDay() {
  const { user, spaces } = useWorkspace();
  const { openNewSpace } = useNewSpace();
  const today = todayIso();

  // My Day is the one intentionally global context: it aggregates every Space.
  const tasks = useQuery({
    queryKey: ["tasks", user?.id, "all"],
    queryFn: () => listTasks(user!.id),
    enabled: Boolean(user),
  });
  const events = useQuery({
    queryKey: ["events", user?.id, "all"],
    queryFn: () => listEvents(user!.id),
    enabled: Boolean(user),
  });
  const knowledge = useQuery({
    queryKey: ["knowledge", user?.id, "all"],
    queryFn: () => listKnowledge(user!.id),
    enabled: Boolean(user),
  });

  const allTasks = tasks.data ?? [];
  const allEvents = events.data ?? [];
  const recentKnowledge = (knowledge.data ?? []).slice(0, 5);

  const open = allTasks.filter((t) => t.status === "open");
  const dueToday = open.filter((t) => t.dueDate === today);
  const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
  const todaysEvents = allEvents.filter((e) => e.date === today);
  const spaceName = (id: string | null) => spaces.find((s) => s.id === id)?.name ?? "No Space";

  return (
    <>
      <TopBar title="My Day" subtitle="Everything happening across your Spaces" onNewSpace={openNewSpace} />
      <div className="flex-1 overflow-y-auto p-6" data-testid="my-day-page">
        <div className="nv-panel nv-glow animate-fade-up rounded-2xl p-6">
          <h2 className="font-heading text-2xl font-semibold" data-testid="my-day-greeting">
            {greeting()}, {user?.name?.split(" ")[0]} 👋
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {open.length === 0 && todaysEvents.length === 0
              ? "Nothing scheduled yet. Add a task or an event to get started."
              : `${dueToday.length} task${dueToday.length === 1 ? "" : "s"} due today and ${todaysEvents.length} event${todaysEvents.length === 1 ? "" : "s"} on your calendar.`}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={ListChecks} label="Tasks Due Today" value={dueToday.length} hint={`${open.length} open in total`} testId="metric-tasks-today" />
            <MetricCard icon={CalendarDays} label="Events Today" value={todaysEvents.length} hint={todaysEvents[0] ? `Next: ${todaysEvents[0].time}` : "Nothing scheduled"} testId="metric-events-today" />
            <MetricCard icon={CheckCircle2} label="Overdue" value={overdue.length} hint={overdue.length ? "Needs attention" : "All clear"} testId="metric-overdue" />
            <MetricCard icon={Diamond} label="Knowledge Items" value={(knowledge.data ?? []).length} hint="Across all Spaces" testId="metric-knowledge" />
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="nv-panel animate-fade-up rounded-2xl p-5" data-testid="today-focus-card">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold">Today&apos;s Focus</h3>
              <Link to="/dashboard/tasks" className="text-xs text-primary" data-testid="my-day-view-tasks-link">
                View all tasks →
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {[...dueToday, ...overdue, ...open].slice(0, 6).length === 0 ? (
                <EmptyState
                  title="No tasks yet"
                  body="Tasks from every Space collect here. Create your first one to see it appear."
                  testId="my-day-tasks-empty"
                  action={
                    <Link to="/dashboard/tasks">
                      <Button size="sm" variant="outline" data-testid="my-day-create-task-button">
                        Create a task
                      </Button>
                    </Link>
                  }
                />
              ) : (
                [...dueToday, ...overdue, ...open]
                  .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
                  .slice(0, 6)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/30"
                      data-testid={`my-day-task-${t.id}`}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                        {spaceName(t.spaceId)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{t.dueDate ?? "—"}</span>
                    </div>
                  ))
              )}
            </div>
          </section>

          <section className="nv-panel animate-fade-up rounded-2xl p-5" data-testid="today-schedule-card">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold">Today&apos;s Schedule</h3>
              <Link to="/dashboard/calendar" className="text-xs text-primary" data-testid="my-day-view-calendar-link">
                Full calendar →
              </Link>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {todaysEvents.length === 0 ? (
                <EmptyState
                  title="Nothing today"
                  body="Events you create in any Space appear here on their day."
                  testId="my-day-events-empty"
                />
              ) : (
                todaysEvents.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
                    data-testid={`my-day-event-${e.id}`}
                  >
                    <span className="w-14 text-xs text-primary">{e.time}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      {spaceName(e.spaceId)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="nv-panel animate-fade-up rounded-2xl p-5" data-testid="recent-knowledge-card">
            <h3 className="font-heading text-base font-semibold">Recent Knowledge</h3>
            <div className="mt-4 flex flex-col gap-2">
              {recentKnowledge.length === 0 ? (
                <EmptyState
                  title="Your Knowledge is empty"
                  body="Notes, documents and web clips you save will surface here, newest first."
                  testId="my-day-knowledge-empty"
                  action={
                    <Link to="/dashboard/knowledge">
                      <Button size="sm" variant="outline" data-testid="my-day-create-note-button">
                        Add a note
                      </Button>
                    </Link>
                  }
                />
              ) : (
                recentKnowledge.map((k) => (
                  <Link
                    key={k.id}
                    to="/dashboard/knowledge"
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/30"
                    data-testid={`my-day-knowledge-${k.id}`}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{k.title}</span>
                    <span className="text-[11px] capitalize text-muted-foreground">{k.kind}</span>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="nv-panel animate-fade-up rounded-2xl p-5" data-testid="my-spaces-card">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-base font-semibold">My Spaces</h3>
              <Link to="/dashboard/spaces" className="text-xs text-primary" data-testid="my-day-view-spaces-link">
                Manage →
              </Link>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {spaces.length === 0 ? (
                <EmptyState
                  title="No Spaces yet"
                  body="Spaces are the heart of Notevoro. Create one for university, freelance work, a startup or your personal life."
                  testId="my-day-spaces-empty"
                  action={
                    <Button size="sm" onClick={openNewSpace} data-testid="my-day-create-space-button">
                      Create your first Space
                    </Button>
                  }
                />
              ) : (
                spaces.map((s) => {
                  const Icon = spaceIcon(s.icon);
                  return (
                    <Link
                      key={s.id}
                      to={`/dashboard/spaces/${s.id}`}
                      className="nv-hover-card flex items-center gap-3 rounded-xl border border-border px-3 py-3"
                      data-testid={`my-day-space-${s.id}`}
                    >
                      <Icon className="size-4" style={{ color: s.color }} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.name}</span>
                      <span className="text-[11px] capitalize text-muted-foreground">{s.templateId}</span>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
