import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { FileText, Globe, Image, Loader2, Plus, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TopBar from "@/components/TopBar";
import { EmptyState } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspace } from "@/lib/workspace";
import { useNewSpace } from "@/lib/newSpace";
import {
  createKnowledge,
  deleteKnowledge,
  listKnowledge,
  updateKnowledge,
} from "@/lib/repo";
import { ApiError, apiPost } from "@/lib/api";
import type { ChatResponse, KnowledgeItem, KnowledgeKind } from "@/types";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  note: StickyNote,
  document: FileText,
  webclip: Globe,
  media: Image,
} as const;

const KIND_LABEL: Record<string, string> = {
  note: "Note",
  document: "Document",
  webclip: "Web Clip",
  media: "Media",
};

const AI_ACTIONS = [
  { id: "summarize", label: "Summarize", prompt: "Summarize this in 5 bullet points." },
  { id: "explain", label: "Explain", prompt: "Explain this simply, as if teaching a beginner." },
  { id: "flashcards", label: "Flashcards", prompt: "Turn this into 8 question/answer flashcards." },
  { id: "quiz", label: "Quiz", prompt: "Create a 5-question multiple choice quiz from this." },
  { id: "tasks", label: "Extract tasks", prompt: "Extract a list of concrete action items from this." },
];

interface Props {
  spaceId?: string;
  embedded?: boolean;
}

export default function Knowledge({ spaceId, embedded }: Props) {
  const { user, spaces, activeSpaceId } = useWorkspace();
  const { openNewSpace } = useNewSpace();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [kind, setKind] = useState("all");
  const [folder, setFolder] = useState("all");
  const [creating, setCreating] = useState(params.get("new") === "note");
  const [openItem, setOpenItem] = useState<KnowledgeItem | null>(null);
  const [aiResult, setAiResult] = useState<string>("");

  const [form, setForm] = useState({
    title: "",
    kind: "note" as KnowledgeKind,
    body: "",
    folder: "Unsorted",
    target: spaceId ?? activeSpaceId ?? "none",
  });

  const scope = spaceId ?? null;
  const itemsQuery = useQuery({
    queryKey: ["knowledge", user?.id, scope ?? "all"],
    queryFn: () => listKnowledge(user!.id, scope),
    enabled: Boolean(user),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["knowledge"] });
  };

  const create = useMutation({
    mutationFn: () =>
      createKnowledge({
        userId: user!.id,
        spaceId: spaceId ?? (form.target === "none" ? null : form.target),
        title: form.title,
        kind: form.kind,
        body: form.body,
        folder: form.folder.trim() || "Unsorted",
      }),
    onSuccess: () => {
      invalidate();
      setCreating(false);
      setForm((f) => ({ ...f, title: "", body: "" }));
      toast.success("Saved to Knowledge");
    },
    onError: () => toast.error("Could not save item"),
  });

  const save = useMutation({
    mutationFn: (item: KnowledgeItem) => updateKnowledge(item),
    onSuccess: () => {
      invalidate();
      toast.success("Updated");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteKnowledge(id),
    onSuccess: () => {
      invalidate();
      setOpenItem(null);
      toast.success("Deleted");
    },
  });

  const runAi = useMutation({
    mutationFn: async (prompt: string) => {
      const item = openItem!;
      const space = spaces.find((s) => s.id === item.spaceId) ?? null;
      const res = await apiPost<ChatResponse>("/voro/chat", {
        messages: [
          { role: "user", content: `${prompt}\n\n---\nTitle: ${item.title}\n\n${item.body}` },
        ],
        space_name: space?.name ?? null,
        space_template: space?.templateId ?? null,
      });
      return res.content;
    },
    onSuccess: (content) => setAiResult(content),
    onError: (err) => {
      const detail =
        err instanceof ApiError && (err.body as { detail?: string } | null)?.detail
          ? (err.body as { detail: string }).detail
          : "Voro request failed.";
      toast.error(detail);
    },
  });

  const items = itemsQuery.data ?? [];
  const folders = useMemo(
    () => Array.from(new Set(items.map((i) => i.folder))).sort(),
    [items],
  );

  const filtered = items.filter((i) => {
    if (kind !== "all" && i.kind !== kind) return false;
    if (folder !== "all" && i.folder !== folder) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        i.title.toLowerCase().includes(q) ||
        i.body.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const spaceName = (id: string | null) => spaces.find((s) => s.id === id)?.name ?? "No Space";

  const body = (
    <div className={cn("flex-1 overflow-y-auto", embedded ? "" : "p-6")} data-testid="knowledge-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={kind} onValueChange={setKind}>
          <TabsList variant="line" data-testid="knowledge-kind-tabs">
            <TabsTrigger value="all" data-testid="knowledge-tab-all">All ({items.length})</TabsTrigger>
            <TabsTrigger value="note" data-testid="knowledge-tab-note">Notes</TabsTrigger>
            <TabsTrigger value="document" data-testid="knowledge-tab-document">Documents</TabsTrigger>
            <TabsTrigger value="webclip" data-testid="knowledge-tab-webclip">Web Clips</TabsTrigger>
            <TabsTrigger value="media" data-testid="knowledge-tab-media">Media</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search knowledge…"
            className="w-[220px]"
            data-testid="knowledge-search-input"
          />
          <Button size="sm" onClick={() => setCreating(true)} data-testid="knowledge-new-button">
            <Plus className="size-4" />
            New
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[210px_1fr]">
        <aside className="nv-panel h-fit rounded-2xl p-3" data-testid="knowledge-folders">
          <p className="px-2 pb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
            FOLDERS
          </p>
          <button
            type="button"
            onClick={() => setFolder("all")}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors",
              folder === "all" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary",
            )}
            data-testid="knowledge-folder-all"
          >
            All Knowledge <span className="text-[11px]">{items.length}</span>
          </button>
          {folders.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFolder(f)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors",
                folder === f ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-secondary",
              )}
              data-testid={`knowledge-folder-${f}`}
            >
              <span className="truncate">{f}</span>
              <span className="text-[11px]">{items.filter((i) => i.folder === f).length}</span>
            </button>
          ))}
        </aside>

        <div className="flex flex-col gap-2" data-testid="knowledge-list">
          {filtered.length === 0 ? (
            <EmptyState
              title={items.length === 0 ? "Your Knowledge is empty" : "No matches"}
              body={
                items.length === 0
                  ? "Notes, documents, web clips and media all live here — searchable, foldered and linked to a Space."
                  : "Try a different search term, folder or type."
              }
              testId="knowledge-empty-state"
              action={
                items.length === 0 ? (
                  <Button size="sm" onClick={() => setCreating(true)} data-testid="knowledge-empty-create-button">
                    Create your first note
                  </Button>
                ) : undefined
              }
            />
          ) : (
            filtered.map((item) => {
              const Icon = KIND_ICON[item.kind];
              return (
                <div
                  key={item.id}
                  className="nv-panel nv-hover-card flex items-center gap-3 rounded-xl px-4 py-3"
                  data-testid={`knowledge-item-${item.id}`}
                >
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setOpenItem(item);
                      setAiResult("");
                    }}
                    data-testid={`knowledge-open-${item.id}`}
                  >
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {KIND_LABEL[item.kind]} · {item.folder}
                    </p>
                  </button>
                  {!spaceId && (
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      {spaceName(item.spaceId)}
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {item.updatedAt.slice(0, 10)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Delete ${item.title}`}
                    onClick={() => remove.mutate(item.id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    data-testid={`knowledge-delete-${item.id}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-[560px]" data-testid="knowledge-create-dialog">
          <DialogHeader>
            <DialogTitle>New Knowledge item</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="k-title">Title</Label>
              <Input
                id="k-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                data-testid="knowledge-title-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Type</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v: string) => setForm({ ...form, kind: v as KnowledgeKind })}
                >
                  <SelectTrigger data-testid="knowledge-kind-select">
                    <SelectValue>{(v) => KIND_LABEL[v as string]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(["note", "document", "webclip", "media"] as KnowledgeKind[]).map((k) => (
                      <SelectItem key={k} value={k} data-testid={`knowledge-kind-${k}`}>
                        {KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="k-folder">Folder</Label>
                <Input
                  id="k-folder"
                  value={form.folder}
                  onChange={(e) => setForm({ ...form, folder: e.target.value })}
                  data-testid="knowledge-folder-input"
                />
              </div>
            </div>
            {!spaceId && (
              <div className="flex flex-col gap-2">
                <Label>Space</Label>
                <Select value={form.target} onValueChange={(v: string) => setForm({ ...form, target: v })}>
                  <SelectTrigger data-testid="knowledge-space-select">
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
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="k-body">Content</Label>
              <Textarea
                id="k-body"
                rows={6}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                data-testid="knowledge-body-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)} data-testid="knowledge-create-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => create.mutate()}
              disabled={!form.title.trim() || create.isPending}
              data-testid="knowledge-create-submit"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View / edit + AI actions */}
      <Dialog open={Boolean(openItem)} onOpenChange={(o) => !o && setOpenItem(null)}>
        <DialogContent className="sm:max-w-[640px]" data-testid="knowledge-detail-dialog">
          <DialogHeader>
            <DialogTitle>{openItem?.title}</DialogTitle>
          </DialogHeader>
          {openItem && (
            <div className="flex flex-col gap-4">
              <Textarea
                rows={8}
                value={openItem.body}
                onChange={(e) => setOpenItem({ ...openItem, body: e.target.value })}
                data-testid="knowledge-detail-body"
              />
              <div>
                <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
                  VORO ACTIONS
                </p>
                <div className="flex flex-wrap gap-2">
                  {AI_ACTIONS.map((a) => (
                    <Button
                      key={a.id}
                      size="xs"
                      variant="outline"
                      disabled={runAi.isPending}
                      onClick={() => runAi.mutate(a.prompt)}
                      data-testid={`knowledge-ai-${a.id}`}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>
                {runAi.isPending && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> Voro is working…
                  </p>
                )}
                {aiResult && (
                  <div
                    className="mt-3 max-h-[220px] overflow-y-auto rounded-xl border border-border bg-secondary/40 p-3 text-xs leading-relaxed whitespace-pre-wrap"
                    data-testid="knowledge-ai-result"
                  >
                    {aiResult}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => openItem && remove.mutate(openItem.id)}
              data-testid="knowledge-detail-delete"
            >
              Delete
            </Button>
            <Button
              onClick={() => openItem && save.mutate(openItem)}
              disabled={save.isPending}
              data-testid="knowledge-detail-save"
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (embedded) return body;

  return (
    <>
      <TopBar
        title="Knowledge"
        subtitle="All your notes, docs and resources in one place"
        onNewSpace={openNewSpace}
        onSearch={setQuery}
        searchValue={query}
      />
      {body}
    </>
  );
}
