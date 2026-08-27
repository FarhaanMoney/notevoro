import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, Diamond, ListChecks } from "lucide-react";
import TopBar from "@/components/TopBar";
import { MetricCard, EmptyState } from "@/components/Primitives";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Tasks from "@/pages/Tasks";
import Knowledge from "@/pages/Knowledge";
import CalendarPage from "@/pages/CalendarPage";
import SpaceTeam from "@/components/SpaceTeam";
import { useWorkspace } from "@/lib/workspace";
import { useNewSpace } from "@/lib/newSpace";
import { getTemplate } from "@/lib/templates";
import { listEvents, listKnowledge, listTasks, todayIso } from "@/lib/repo";
import { spaceIcon } from "@/components/icons";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

const CORE_TABS = ["Overview", "Knowledge", "Tasks", "Calendar"];
/** Modules that the shared membership engine serves, whatever the template calls them. */
const TEAM_TABS = ["Team", "Students"];

export default function SpaceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, spaces, spacesLoading, setActiveSpaceId } = useWorkspace();
  const { openNewSpace } = useNewSpace();
  const [tab, setTab] = useState("Overview");

  const space = spaces.find((s) => s.id === id) ?? null;

  useEffect(() => {
    if (space) setActiveSpaceId(space.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?.id]);

  const tasks = useQuery({
    queryKey: ["tasks", user?.id, id],
    queryFn: () => listTasks(user!.id, id!),
    enabled: Boolean(user && id),
  });
  const events = useQuery({
    queryKey: ["events", user?.id, id],
    queryFn: () => listEvents(user!.id, id!),
    enabled: Boolean(user && id),
  });
  const knowledge = useQuery({
    queryKey: ["knowledge", user?.id, id],
    queryFn: () => listKnowledge(user!.id, id!),
    enabled: Boolean(user && id),
  });

  if (!spacesLoading && !space) {
    // A Space id that is not in this user's own list is simply not found for them.
    return <Navigate to="/dashboard/spaces" replace />;
  }
  if (!space) return <div className="p-6 text-sm text-muted-foreground">Loading Space…</div>;

  const template = getTemplate(space.templateId);
  const Icon = spaceIcon(space.icon);
  const today = todayIso();
  const open = (tasks.data ?? []).filter((t) => t.status === "open");
  const done = (tasks.data ?? []).filter((t) => t.status === "done");
  const todaysEvents = (events.data ?? []).filter((e) => e.date === today);

  const metricValue: Record<string, number> = {
    eventsToday: todaysEvents.length,
    tasksDue: open.filter((t) => t.dueDate === today).length,
    knowledge: (knowledge.data ?? []).length,
    completed: done.length,
    default: 0,
  };
  const metricIcon = [CalendarDays, ListChecks, Diamond, CheckCircle2];

  return (
    <>
      <TopBar
        title={space.name}
        subtitle={`${template.name} Space`}
        onNewSpace={openNewSpace}
      />
      <div className="flex-1 overflow-y-auto p-6" data-testid="space-detail-page">
        <div className="nv-panel nv-glow animate-fade-up rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl"
              style={{ background: `color-mix(in oklab, ${space.color} 18%, transparent)` }}
            >
              <Icon className="size-5" style={{ color: space.color }} />
            </span>
            <div>
              <h2 className="font-heading text-2xl font-semibold" data-testid="space-greeting">
                {greeting()}, {user?.name?.split(" ")[0]} 👋
              </h2>
              <p className="text-sm text-muted-foreground">
                Here&apos;s what&apos;s happening in your {template.name} Space.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {template.metrics.map((m, i) => (
              <MetricCard
                key={m.key}
                icon={metricIcon[i % metricIcon.length]}
                label={m.label}
                value={metricValue[m.key] ?? 0}
                testId={`space-metric-${m.key}`}
              />
            ))}
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-5">
          <TabsList variant="line" className="flex-wrap" data-testid="space-module-tabs">
            {space.modules.map((m) => (
              <TabsTrigger key={m} value={m} data-testid={`space-tab-${m.toLowerCase()}`}>
                {m}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="mt-5" data-testid="space-module-content">
          {tab === "Overview" && (
            <div className="grid gap-5 xl:grid-cols-2">
              <section className="nv-panel rounded-2xl p-5" data-testid="space-overview-tasks">
                <h3 className="font-heading text-base font-semibold">Tasks in this Space</h3>
                <div className="mt-3 flex flex-col gap-2">
                  {open.length === 0 ? (
                    <EmptyState
                      title="No open tasks"
                      body="Open the Tasks module to add work that belongs to this Space only."
                      testId="space-overview-tasks-empty"
                    />
                  ) : (
                    open.slice(0, 6).map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
                        data-testid={`space-overview-task-${t.id}`}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                        <span className="text-[11px] text-muted-foreground">{t.dueDate ?? "—"}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
              <section className="nv-panel rounded-2xl p-5" data-testid="space-overview-schedule">
                <h3 className="font-heading text-base font-semibold">Today&apos;s Schedule</h3>
                <div className="mt-3 flex flex-col gap-2">
                  {todaysEvents.length === 0 ? (
                    <EmptyState
                      title="Nothing today"
                      body="Events created in this Space show up here and in the global Calendar."
                      testId="space-overview-schedule-empty"
                    />
                  ) : (
                    todaysEvents.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
                        data-testid={`space-overview-event-${e.id}`}
                      >
                        <span className="w-14 text-xs text-primary">{e.time}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
          {tab === "Tasks" && <Tasks spaceId={space.id} embedded />}
          {tab === "Knowledge" && <Knowledge spaceId={space.id} embedded />}
          {tab === "Calendar" && <CalendarPage spaceId={space.id} embedded />}
          {TEAM_TABS.includes(tab) && <SpaceTeam space={space} label={tab} />}
          {!CORE_TABS.includes(tab) && !TEAM_TABS.includes(tab) && (
            <EmptyState
              title={`${tab} — powered by the shared engines`}
              body={`This module is part of the ${template.name} template. ${tab} items are stored as Knowledge and Tasks scoped to this Space, so use the Knowledge and Tasks modules with the "${tab}" folder or tag. Dedicated ${tab} views arrive in a later phase — nothing here is faked.`}
              testId="space-module-placeholder"
            />
          )}
        </div>
      </div>
    </>
  );
}
