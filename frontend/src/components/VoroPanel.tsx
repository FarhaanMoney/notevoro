import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ApiError, apiGet, apiPost } from "@/lib/api";
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
} from "@/lib/repo";
import type { ChatResponse, ProviderStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const errorDetail = (err: unknown): string => {
  if (err instanceof ApiError) {
    const body = err.body as { detail?: unknown } | null;
    if (body && typeof body.detail === "string") return body.detail;
    return `Voro request failed (${err.status}).`;
  }
  return err instanceof Error ? err.message : "Voro request failed.";
};

export default function VoroPanel() {
  const { user, activeSpace } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const spaceKey = activeSpace?.id ?? "global";
  const suggestions = activeSpace
    ? getTemplate(activeSpace.templateId).suggestions
    : ["Plan my day", "Summarize my notes", "Analyze my tasks", "What is due today?"];

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

  useEffect(() => {
    setConversationId(null);
  }, [spaceKey]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.data?.length]);

  const buildContext = async (): Promise<string> => {
    if (!user) return "";
    const spaceId = activeSpace?.id ?? null;
    const [tasks, events, knowledge] = await Promise.all([
      listTasks(user.id, spaceId),
      listEvents(user.id, spaceId),
      listKnowledge(user.id, spaceId),
    ]);
    const lines = [
      `Open tasks: ${tasks.filter((t) => t.status === "open").map((t) => t.title).slice(0, 12).join("; ") || "none"}`,
      `Upcoming events: ${events.map((e) => `${e.date} ${e.time} ${e.title}`).slice(0, 12).join("; ") || "none"}`,
      `Knowledge items: ${knowledge.map((k) => k.title).slice(0, 12).join("; ") || "none"}`,
    ];
    return lines.join("\n");
  };

  const send = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error("Not signed in.");
      let convId = conversationId;
      if (!convId) {
        const conv = await createConversation(
          user.id,
          activeSpace?.id ?? null,
          text.slice(0, 42) || "New conversation",
        );
        convId = conv.id;
        setConversationId(conv.id);
      }
      await addMessage(user.id, convId, "user", text);
      await queryClient.invalidateQueries({ queryKey: ["messages", user.id, convId] });
      await queryClient.invalidateQueries({ queryKey: ["conversations", user.id, spaceKey] });

      const history = await listMessages(user.id, convId);
      const reply = await apiPost<ChatResponse>("/voro/chat", {
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        space_name: activeSpace?.name ?? null,
        space_template: activeSpace?.templateId ?? null,
        context: await buildContext(),
      });
      await addMessage(user.id, convId, "assistant", reply.content);
      return convId;
    },
    onSuccess: (convId) => {
      void queryClient.invalidateQueries({ queryKey: ["messages", user?.id, convId] });
    },
    onError: (err) => toast.error(errorDetail(err)),
  });

  const removeConversation = useMutation({
    mutationFn: (id: string) => deleteConversation(user!.id, id),
    onSuccess: (_d, id) => {
      if (id === conversationId) setConversationId(null);
      void queryClient.invalidateQueries({ queryKey: ["conversations", user?.id, spaceKey] });
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

  return (
    <aside
      className="hidden h-full w-[300px] shrink-0 flex-col gap-3 border-l border-border bg-sidebar p-4 xl:flex"
      data-testid="voro-panel"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="font-heading text-base font-semibold">Voro</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="New conversation"
            onClick={() => setConversationId(null)}
            data-testid="voro-new-conversation-button"
          >
            <MessageSquarePlus className="size-4" />
          </Button>
          <Link
            to="/dashboard/settings"
            aria-label="Voro settings"
            className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            data-testid="voro-settings-link"
          >
            <SettingsIcon className="size-4" />
          </Link>
        </div>
      </div>

      <p className="text-xs text-muted-foreground" data-testid="voro-context-label">
        Context:{" "}
        <span className="text-foreground">
          {activeSpace ? `${activeSpace.name} · ${getTemplate(activeSpace.templateId).name}` : "My Day (all Spaces)"}
        </span>
      </p>

      <div
        ref={scrollRef}
        className="nv-panel flex-1 overflow-y-auto rounded-xl p-3"
        data-testid="voro-messages"
      >
        {activeMessages.length === 0 ? (
          <div className="animate-fade-up">
            <p className="font-heading text-sm font-semibold">Hi {user?.name?.split(" ")[0]} 👋</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              I&apos;m Voro. I can see this Space&apos;s tasks, events and Knowledge.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft(s)}
                  className="rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  data-testid={`voro-suggestion-${s.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {activeMessages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "self-end bg-primary/15 text-foreground"
                    : "self-start bg-secondary text-secondary-foreground",
                )}
                data-testid={`voro-message-${m.role}`}
              >
                {m.content}
              </div>
            ))}
            {send.isPending && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> Voro is thinking…
              </span>
            )}
          </div>
        )}
      </div>

      {notConfigured && (
        <button
          type="button"
          onClick={() => navigate("/dashboard/settings")}
          className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-left text-[11px] leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
          data-testid="voro-provider-warning"
        >
          No AI provider configured — conversations still save locally. Open Settings → AI Providers.
        </button>
      )}

      <div className="rounded-xl border border-border p-2" data-testid="voro-composer">
        <Textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask Voro anything…"
          className="min-h-0 resize-none border-0 bg-transparent p-1 text-xs shadow-none focus-visible:ring-0"
          data-testid="voro-input"
        />
        <div className="flex justify-end">
          <Button
            size="icon-sm"
            onClick={submit}
            disabled={send.isPending || !draft.trim()}
            aria-label="Send message to Voro"
            data-testid="voro-send-button"
          >
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          </Button>
        </div>
      </div>

      <div data-testid="voro-recent-conversations">
        <p className="mb-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
          RECENT
        </p>
        {(conversations.data ?? []).length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No conversations in this context yet.</p>
        ) : (
          <div className="flex max-h-[132px] flex-col gap-0.5 overflow-y-auto">
            {(conversations.data ?? []).map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors",
                  c.id === conversationId ? "bg-accent text-accent-foreground" : "hover:bg-secondary",
                )}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left"
                  onClick={() => setConversationId(c.id)}
                  data-testid={`voro-conversation-${c.id}`}
                >
                  {c.title}
                </button>
                <button
                  type="button"
                  aria-label="Rename conversation"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={async () => {
                    const title = window.prompt("Rename conversation", c.title);
                    if (title?.trim()) {
                      await renameConversation(c, title.trim());
                      void queryClient.invalidateQueries({
                        queryKey: ["conversations", user?.id, spaceKey],
                      });
                    }
                  }}
                  data-testid={`voro-rename-${c.id}`}
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label="Delete conversation"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => removeConversation.mutate(c.id)}
                  data-testid={`voro-delete-${c.id}`}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-center text-[10px] text-muted-foreground">
        Voro can make mistakes. Check important info.
      </p>
    </aside>
  );
}
