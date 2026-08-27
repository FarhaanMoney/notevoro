import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TopBar from "@/components/TopBar";
import { EmptyState } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { createTask, deleteTask, listTasks, todayIso, updateTask } from "@/lib/repo";
import type { Priority, Task } from "@/types";
import { cn } from "@/lib/utils";

const PRIORITIES: Priority[] = ["low", "medium", "high"];
const PRIORITY_LABEL: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

interface Props {
  /** When set, the page is embedded inside a Space and locked to that Space. */
  spaceId?: string;
  embedded?: boolean;
}

export default function Tasks({ spaceId, embedded }: Props) {
  const { user, spaces, activeSpaceId } = useWorkspace();
  const { openNewSpace } = useNewSpace();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [tab, setTab] = useState("today");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [due, setDue] = useState(todayIso());
  const [target, setTarget] = useState<string>(spaceId ?? activeSpaceId ?? "none");
  const [showForm, setShowForm] = useState(params.get("new") === "1");

  const scope = spaceId ?? null;
  const queryKey = ["tasks", user?.id, scope ?? "all"];
  const tasksQuery = useQuery({
    queryKey,
    queryFn: () => listTasks(user!.id, scope),
    enabled: Boolean(user),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  const add = useMutation({
    mutationFn: () =>
      createTask({
        userId: user!.id,
        spaceId: spaceId ?? (target === "none" ? null : target),
        title,
        priority,
        dueDate: due || null,
      }),
    onSuccess: () => {
      setTitle("");
      invalidate();
      toast.success("Task created");
    },
    onError: () => toast.error("Could not create task"),
  });

  const toggle = useMutation({
    mutationFn: (task: Task) =>
      updateTask({ ...task, status: task.status === "done" ? "open" : "done" }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: invalidate,
  });

  const today = todayIso();
  const all = tasksQuery.data ?? [];
  const filtered = useMemo(() => {
    if (tab === "today") return all.filter((t) => t.status === "open" && (!t.dueDate || t.dueDate <= today));
    if (tab === "upcoming") return all.filter((t) => t.status === "open" && t.dueDate && t.dueDate > today);
    if (tab === "completed") return all.filter((t) => t.status === "done");
    return all;
  }, [all, tab, today]);

  const spaceName = (id: string | null) => spaces.find((s) => s.id === id)?.name ?? "No Space";

  const body = (
    <div className={cn("flex-1 overflow-y-auto", embedded ? "" : "p-6")} data-testid="tasks-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="line" data-testid="tasks-tabs">
            <TabsTrigger value="today" data-testid="tasks-tab-today">Today</TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tasks-tab-upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="all" data-testid="tasks-tab-all">All Tasks</TabsTrigger>
            <TabsTrigger value="completed" data-testid="tasks-tab-completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} data-testid="tasks-toggle-form-button">
          <Plus className="size-4" />
          New Task
        </Button>
      </div>

      {showForm && (
        <form
          className="nv-panel mt-4 flex animate-fade-up flex-wrap items-end gap-3 rounded-xl p-4"
          data-testid="task-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) add.mutate();
          }}
        >
          <div className="min-w-[220px] flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              data-testid="task-title-input"
            />
          </div>
          <Input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-[150px]"
            data-testid="task-due-input"
          />
          <Select value={priority} onValueChange={(v: string) => setPriority(v as Priority)}>
            <SelectTrigger className="w-[130px]" data-testid="task-priority-select">
              <SelectValue>{(v) => PRIORITY_LABEL[v as string] ?? "Priority"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} data-testid={`task-priority-${p}`}>
                  {PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!spaceId && (
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="w-[170px]" data-testid="task-space-select">
                <SelectValue>
                  {(v) => (v === "none" ? "No Space" : spaceName(v as string))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Space</SelectItem>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id} data-testid={`task-space-option-${s.id}`}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="submit" disabled={!title.trim() || add.isPending} data-testid="task-submit-button">
            Add Task
          </Button>
        </form>
      )}

      <div className="mt-4 flex flex-col gap-2" data-testid="tasks-list">
        {filtered.length === 0 ? (
          <EmptyState
            title="Nothing here"
            body="Tasks belong to a Space (or to no Space at all) and can carry a due date and priority. Create one to get started."
            testId="tasks-empty-state"
          />
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className="nv-panel nv-hover-card flex items-center gap-3 rounded-xl px-4 py-3"
              data-testid={`task-row-${t.id}`}
            >
              <Checkbox
                checked={t.status === "done"}
                onCheckedChange={() => toggle.mutate(t)}
                aria-label={`Toggle ${t.title}`}
                data-testid={`task-checkbox-${t.id}`}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  t.status === "done" && "text-muted-foreground line-through",
                )}
                data-testid={`task-title-${t.id}`}
              >
                {t.title}
              </span>
              {!spaceId && (
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                  {spaceName(t.spaceId)}
                </span>
              )}
              <span
                className={cn(
                  "text-[11px]",
                  t.priority === "high" ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {PRIORITY_LABEL[t.priority]}
              </span>
              <span className="w-[86px] text-right text-[11px] text-muted-foreground">
                {t.dueDate ?? "No date"}
              </span>
              <button
                type="button"
                aria-label={`Delete ${t.title}`}
                onClick={() => remove.mutate(t.id)}
                className="text-muted-foreground transition-colors hover:text-destructive"
                data-testid={`task-delete-${t.id}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  if (embedded) return body;

  return (
    <>
      <TopBar
        title="Tasks"
        subtitle="One task engine, shared by every Space"
        onNewSpace={openNewSpace}
      />
      {body}
    </>
  );
}
