import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import TopBar from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/auth";
import { useNewSpace } from "@/lib/newSpace";
import { useWorkspace } from "@/lib/workspace";
import { getTemplate } from "@/lib/templates";
import {
  addMessage,
  createConversation,
  deleteConversation,
  listConversations,
  listEvents,
  listKnowledge,
  listMessages,
  listTasks,
  renameConversation,
  todayIso,
} from "@/lib/repo";
import type { ChatResponse, ProviderStatus } from "@/types";
import { cn } from "@/lib/utils";

const relative = (iso: string): string => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
};

/**
 * Renders Voro's answer with light Markdown affordances (headings, bullets, numbered
 * lists, bold) — enough to make summaries and flashcards readable without pulling in a
 * full Markdown engine.
 */
function Rendered({ text }: { text: string }) {
  const blocks = text.split("\n");
  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((line, i) => {
        const bold = (s: string) =>
          s.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="font-semibold text-foreground">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            ),
          );
        if (/^#{1,3}\s/.test(line))
          return (
            <p key={i} className="font-heading text-sm font-semibold">
              {line.replace(/^#{1,3}\s/, "")}
            </p>
          );
        if (/^\s*[-*]\s/.test(line))
          return (
            <p key={i} className="flex gap-2 text-sm leading-relaxed">
              <span className="text-primary">•</span>
              <span>{bold(line.replace(/^\s*[-*]\s/, ""))}</span>
            </p>
          );
        if (/^\s*\d+[.)]\s/.test(line))
          return (
            <p key={i} className="text-sm leading-relaxed">
              {bold(line)}
            </p>
          );
        if (!line.trim()) return <span key={i} className="h-1" />;
        return (
          <p key={i} className="text-sm leading-relaxed">
            {bold(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function VoroPage() {
  const { openNewSpace } = useNewSpace();
  const { user, activeSpace } = useWorkspace();
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const spaceKey = activeSpace?.id ?? "global";
  const template = activeSpace ? getTemplate(activeSpace.templateId) : null;

  const provider = useQuery({
    queryKey: ["voro", "provider"],
    queryFn: () => apiGet<ProviderStatus>("/voro/provider"),
    retry: false,
  });

  const conversations = useQuery({
    queryKey: ["conversations", user?.id, spaceKey],
    queryFn: () => listConversations(user!.id, activeSpace?.id ?? null),
    enabled: Boolean(user),
  });

  const messages = useQuery({
    queryKey: ["messages", user?.id, conversationId],
    queryFn: () => listMessages(user!.id, conversationId!),
    enabled: Boolean(user && conversationId),
  });

  // Live snapshot of the vault, scoped to the current Space — this is what Voro is told.
  const context = useQuery({
    queryKey: ["voro-context", user?.id, spaceKey],
    queryFn: async () => {
      const spaceId = activeSpace?.id ?? null;
      const [tasks, events, knowledge] = await Promise.all([
        listTasks(user!.id, spaceId),
        listEvents(user!.id, spaceId),
        listKnowledge(user!.id, spaceId),
      ]);
      return { tasks, events, knowledge };
    },
    enabled: Boolean(user),
  });

  const suggestions = useMemo(() => {
    const base = template?.suggestions ?? [
      "Plan my day",
      "Summarize my notes",
      "Analyze my tasks",
      "What is due today?",
    ];
    return base;
  }, [template]);

  useEffect(() => {
    setConversationId(null);
  }, [spaceKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data?.length]);

  const buildContext = (): string => {
    const c = context.data;
    if (!c) return "";
    const today = todayIso();
    const open = c.tasks.filter((t) => t.status === "open");
    return [
      `Today's date: ${today}`,
      `Open tasks (${open.length}): ${
        open.map((t) => `${t.title}${t.dueDate ? ` [due ${t.dueDate}]` : ""}`).slice(0, 20).join("; ") ||
        "none"
      }`,
      `Upcoming events: ${
        c.events.map((e) => `${e.date} ${e.time} ${e.title}`).slice(0, 20).join("; ") || "none"
      }`,
      `Knowledge notes (${c.knowledge.length}):`,
      ...c.knowledge
        .slice(0, 8)
        .map((k) => `- ${k.title} (${k.kind}/${k.folder}): ${k.body.slice(0, 600)}`),
    ].join("\n");
  };

  const send = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error("Not signed in.");
      let convId = conversationId;
      if (!convId) {
        const conv = await createConversation(
          user.id,
          activeSpace?.id ?? null,
          text.slice(0, 48) || "New conversation",
        );
        convId = conv.id;
        setConversationId(conv.id);
      }
      await addMessage(user.id, convId, "user", text);
      await queryClient.refetchQueries({ queryKey: ["messages", user.id, convId] });
      await queryClient.refetchQueries({ queryKey: ["conversations", user.id, spaceKey] });

      const history = await listMessages(user.id, convId);
      const reply = await apiPost<ChatResponse>("/voro/chat", {
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        space_name: activeSpace?.name ?? null,
        space_template: activeSpace?.templateId ?? null,
        context: buildContext(),
      });
      await addMessage(user.id, convId, "assistant", reply.content);
      return convId;
    },
    onSuccess: (convId) => {
      void queryClient.refetchQueries({ queryKey: ["messages", user?.id, convId] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Voro request failed.")),
  });

  const removeConversation = useMutation({
    mutationFn: (id: string) => deleteConversation(user!.id, id),
    onSuccess: (_d, id) => {
      if (id === conversationId) setConversationId(null);
      void queryClient.refetchQueries({ queryKey: ["conversations", user?.id, spaceKey] });
    },
  });

  const submit = () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setDraft("");
    send.mutate(text);
  };

  const activeMessages = messages.data ?? [];
  const notConfigured = provider.data ? !provider.data.configured : false;
  const allConversations = conversations.data ?? [];
  const visible = search.trim()
    ? allConversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : allConversations;

  const stats = context.data
    ? [
        { label: "open tasks", value: context.data.tasks.filter((t) => t.status === "open").length },
        { label: "events", value: context.data.events.length },
        { label: "notes", value: context.data.knowledge.length },
      ]
    : [];

  return (
    <>
      <TopBar
        title="Voro"
        subtitle={
          activeSpace
            ? `Assisting inside ${activeSpace.name} · ${template?.name}`
            : "Global context — every Space"
        }
        onNewSpace={openNewSpace}
      />
      <div className="grid min-h-0 flex-1 gap-5 p-6 lg:grid-cols-[260px_1fr]" data-testid="voro-page">
        {/* conversation rail */}
        <aside className="nv-panel flex min-h-0 flex-col rounded-2xl p-3" data-testid="voro-conversation-rail">
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              setConversationId(null);
              setDraft("");
            }}
            data-testid="voro-page-new-chat"
          >
            <MessageSquarePlus className="size-4" />
            New chat
          </Button>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="h-9 pl-8 text-xs"
              data-testid="voro-search-conversations"
            />
          </div>
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <p className="px-2 py-3 text-[11px] leading-relaxed text-muted-foreground">
                No chats in this context yet. Voro keeps a separate history per Space.
              </p>
            ) : (
              visible.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-lg px-2.5 py-2 transition-colors",
                    c.id === conversationId ? "bg-accent text-accent-foreground" : "hover:bg-secondary",
                  )}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-xs"
                    onClick={() => setConversationId(c.id)}
                    data-testid={`voro-page-conversation-${c.id}`}
                  >
                    {c.title}
                  </button>
                  <span className="text-[10px] text-muted-foreground group-hover:hidden">
                    {relative(c.updatedAt)}
                  </span>
                  <button
                    type="button"
                    aria-label="Rename chat"
                    className="hidden text-muted-foreground group-hover:block hover:text-foreground"
                    onClick={async () => {
                      const title = window.prompt("Rename chat", c.title);
                      if (title?.trim()) {
                        await renameConversation(c, title.trim());
                        void queryClient.refetchQueries({
                          queryKey: ["conversations", user?.id, spaceKey],
                        });
                      }
                    }}
                    data-testid={`voro-page-rename-${c.id}`}
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete chat"
                    className="hidden text-muted-foreground group-hover:block hover:text-destructive"
                    onClick={() => removeConversation.mutate(c.id)}
                    data-testid={`voro-page-delete-${c.id}`}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))
            )}
          </div>
          <Link
            to="/dashboard/settings"
            className="mt-3 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            data-testid="voro-page-settings-link"
          >
            <SettingsIcon className="size-3.5" />
            AI provider settings
          </Link>
        </aside>

        {/* chat surface */}
        <section className="nv-panel flex min-h-0 flex-col rounded-2xl" data-testid="voro-chat">
          <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3.5">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {activeSpace ? activeSpace.name : "My Day"} context
              </p>
              <p className="truncate text-[11px] text-muted-foreground" data-testid="voro-page-context">
                {stats.length > 0
                  ? `Voro can see ${stats.map((s) => `${s.value} ${s.label}`).join(", ")} from your vault`
                  : "Reading your vault…"}
              </p>
            </div>
            {provider.data && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-medium",
                  provider.data.configured
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-secondary text-muted-foreground",
                )}
                data-testid="voro-page-provider-chip"
              >
                {provider.data.configured ? `Model: ${provider.data.model}` : "No AI provider"}
              </span>
            )}
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5" data-testid="voro-page-messages">
            {activeMessages.length === 0 ? (
              <div className="mx-auto max-w-2xl animate-fade-up py-6">
                <h2 className="font-heading text-2xl font-semibold">
                  Hi {user?.name?.split(" ")[0]} — I&apos;m Voro
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {activeSpace
                    ? `I'm scoped to your ${activeSpace.name} Space and can read its tasks, calendar and notes from your vault. I won't touch anything from your other Spaces.`
                    : "You're in the global My Day context, so I can look across every Space at once."}
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDraft(s)}
                      className="nv-hover-card rounded-xl border border-border px-4 py-3 text-left text-sm"
                      data-testid={`voro-page-suggestion-${s.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex max-w-2xl flex-col gap-5">
                {activeMessages.map((m) =>
                  m.role === "user" ? (
                    <div
                      key={m.id}
                      className="self-end rounded-2xl bg-primary/15 px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                      style={{ maxWidth: "82%" }}
                      data-testid="voro-page-message-user"
                    >
                      {m.content}
                    </div>
                  ) : (
                    <div key={m.id} className="flex gap-3" data-testid="voro-page-message-assistant">
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                        <Sparkles className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <Rendered text={m.content} />
                      </div>
                    </div>
                  ),
                )}
                {send.isPending && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span className="animate-soft-pulse">Voro is thinking…</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {notConfigured && (
            <div
              className="mx-5 mb-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground"
              data-testid="voro-page-provider-warning"
            >
              No AI provider is configured yet, so Voro can&apos;t answer — your messages are still
              saved. Add <span className="font-mono text-foreground">AI_BASE_URL</span>,{" "}
              <span className="font-mono text-foreground">AI_API_KEY</span> and{" "}
              <span className="font-mono text-foreground">AI_MODEL</span> (see Settings → AI
              Providers) and Voro replies immediately.
            </div>
          )}

          <div className="px-5 pb-5">
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-background/50 p-2 transition-colors focus-within:border-primary/40">
              <Textarea
                rows={1}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={
                  activeSpace ? `Ask Voro about ${activeSpace.name}…` : "Ask Voro anything…"
                }
                className="max-h-40 min-h-0 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                data-testid="voro-page-input"
              />
              <Button
                size="icon"
                className="rounded-xl"
                onClick={submit}
                disabled={!draft.trim() || send.isPending}
                aria-label="Send to Voro"
                data-testid="voro-page-send"
              >
                {send.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4" />
                )}
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              Enter to send · Shift+Enter for a new line · Voro can make mistakes
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
