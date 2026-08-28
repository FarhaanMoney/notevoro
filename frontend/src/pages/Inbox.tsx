import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AtSign,
  Check,
  Loader2,
  MailPlus,
  MessageSquare,
  Send,
  Users,
  X,
} from "lucide-react";
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
  DialogDescription,
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
import { useNewSpace } from "@/lib/newSpace";
import { useWorkspace } from "@/lib/workspace";
import { apiErrorMessage } from "@/lib/auth";
import {
  listMentions,
  listThreadMessages,
  listThreads,
  markThreadRead,
  sendThreadMessage,
  startDirectThread,
  startSpaceThread,
} from "@/lib/messagesApi";
import {
  acceptInvitation,
  declineInvitation,
  listActivity,
  listMyInvitations,
} from "@/lib/spacesApi";
import { usePresence } from "@/lib/usePresence";
import type { MessageThread } from "@/types";
import { cn } from "@/lib/utils";

const relative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((p) => p.slice(0, 1).toUpperCase())
    .join("");

export default function InboxPage() {
  const { openNewSpace } = useNewSpace();
  const { user, spaces, counts } = useWorkspace();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("messages");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [spaceTarget, setSpaceTarget] = useState<string>("none");
  const [search, setSearch] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const threads = useQuery({
    queryKey: ["threads", user?.id],
    queryFn: listThreads,
    enabled: Boolean(user),
    refetchInterval: 8000,
  });

  const messages = useQuery({
    queryKey: ["thread-messages", threadId],
    queryFn: () => listThreadMessages(threadId!),
    enabled: Boolean(threadId),
    refetchInterval: 5000,
  });

  const invitations = useQuery({
    queryKey: ["invitations", user?.id],
    queryFn: listMyInvitations,
    enabled: Boolean(user),
  });

  const mentions = useQuery({
    queryKey: ["mentions", user?.id],
    queryFn: listMentions,
    enabled: Boolean(user),
  });

  const activity = useQuery({
    queryKey: ["activity", user?.id],
    queryFn: listActivity,
    enabled: Boolean(user),
  });

  const refreshInbox = () => {
    void queryClient.refetchQueries({ queryKey: ["threads"] });
    void queryClient.refetchQueries({ queryKey: ["inbox", "counts"] });
    void queryClient.refetchQueries({ queryKey: ["mentions"] });
  };

  /**
   * Seed the freshly created thread into the cache BEFORE selecting it. Otherwise
   * `activeThread` stays on the previous conversation until the refetch lands, and a
   * fast typist can send a message into the wrong thread.
   */
  const selectThread = (thread: MessageThread) => {
    queryClient.setQueryData<MessageThread[]>(["threads", user?.id], (prev) => {
      const rest = (prev ?? []).filter((t) => t.id !== thread.id);
      return [thread, ...rest];
    });
    setThreadId(thread.id);
  };

  const openThread = useMutation({
    mutationFn: async (id: string) => {
      await markThreadRead(id);
      return id;
    },
    onSuccess: (id) => {
      setThreadId(id);
      refreshInbox();
    },
  });

  const send = useMutation({
    // Always send to the thread actually on screen, never to a stale selection.
    mutationFn: (body: string) => sendThreadMessage(activeThread!.id, body),
    onSuccess: (msg) => {
      setDraft("");
      void queryClient.refetchQueries({ queryKey: ["thread-messages", msg.conversation_id] });
      refreshInbox();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Message not sent")),
  });

  const startDirect = useMutation({
    mutationFn: () => startDirectThread(inviteEmail),
    onSuccess: (thread) => {
      setComposeOpen(false);
      setInviteEmail("");
      setDraft("");
      selectThread(thread);
      setTab("messages");
      refreshInbox();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not start conversation")),
  });

  const startSpace = useMutation({
    mutationFn: () => startSpaceThread(spaceTarget),
    onSuccess: (thread) => {
      setComposeOpen(false);
      setDraft("");
      selectThread(thread);
      setTab("messages");
      refreshInbox();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not open the Space conversation")),
  });

  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      accept ? acceptInvitation(id) : declineInvitation(id),
    onSuccess: (res) => {
      void queryClient.invalidateQueries();
      toast.success(res.message);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not respond to the invitation")),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length, threadId]);

  const allThreads = threads.data ?? [];
  const visibleThreads = search.trim()
    ? allThreads.filter(
        (t) =>
          t.title.toLowerCase().includes(search.toLowerCase()) ||
          t.last_message.toLowerCase().includes(search.toLowerCase()),
      )
    : allThreads;
  const activeThread = allThreads.find((t) => t.id === threadId) ?? null;
  const { onlineIds, typingUsers } = usePresence(threadId, draft);

  const submit = () => {
    const body = draft.trim();
    if (!body || !activeThread || send.isPending) return;
    send.mutate(body);
  };

  return (
    <>
      <TopBar
        title="Inbox"
        subtitle="Messages, mentions, invitations and activity"
        onNewSpace={openNewSpace}
      />
      <div className="flex min-h-0 flex-1 flex-col p-6" data-testid="inbox-page">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList variant="line" data-testid="inbox-tabs">
              <TabsTrigger value="messages" data-testid="inbox-tab-messages">
                Messages{counts?.messages ? ` (${counts.messages})` : ""}
              </TabsTrigger>
              <TabsTrigger value="mentions" data-testid="inbox-tab-mentions">
                Mentions{counts?.mentions ? ` (${counts.mentions})` : ""}
              </TabsTrigger>
              <TabsTrigger value="invitations" data-testid="inbox-tab-invitations">
                Invitations{counts?.invitations ? ` (${counts.invitations})` : ""}
              </TabsTrigger>
              <TabsTrigger value="activity" data-testid="inbox-tab-activity">
                Activity
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => setComposeOpen(true)} data-testid="inbox-new-message-button">
            <MailPlus className="size-4" />
            New Message
          </Button>
        </div>

        {tab === "messages" && (
          <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_1fr]">
            <aside className="nv-panel flex min-h-0 flex-col rounded-2xl p-2" data-testid="thread-list">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="mb-2"
                data-testid="thread-search-input"
              />
              <div className="min-h-0 flex-1 overflow-y-auto">
                {visibleThreads.length === 0 ? (
                  <p className="px-3 py-4 text-xs leading-relaxed text-muted-foreground">
                    No conversations yet. Use New Message to start one with anyone on Notevoro by
                    email, or open a Space team chat.
                  </p>
                ) : (
                  visibleThreads.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openThread.mutate(t.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        t.id === threadId ? "bg-accent" : "hover:bg-secondary",
                      )}
                      data-testid={`thread-item-${t.id}`}
                    >
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold",
                          t.kind === "space"
                            ? "bg-primary/20 text-primary"
                            : "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {t.kind === "space" ? <Users className="size-4" /> : initials(t.title)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {t.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {relative(t.updated_at)}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                            {t.last_message || "No messages yet"}
                          </span>
                          {t.unread > 0 && (
                            <span
                              className="grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground"
                              data-testid={`thread-unread-${t.id}`}
                            >
                              {t.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <section className="nv-panel flex min-h-0 flex-col rounded-2xl" data-testid="thread-view">
              {!activeThread ? (
                <div className="grid flex-1 place-items-center p-6">
                  <p className="max-w-sm text-center text-sm leading-relaxed text-muted-foreground">
                    Select a conversation, or start a new one. Messaging uses real user ids — your
                    email is just how people find you.
                  </p>
                </div>
              ) : (
                <>
                  <header className="flex items-center gap-3 border-b border-border px-4 py-3">
                    <span className="relative">
                      <span className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-semibold">
                        {activeThread.kind === "space" ? (
                          <Users className="size-4" />
                        ) : (
                          initials(activeThread.title)
                        )}
                      </span>
                      {activeThread.participant_ids.some(
                        (id) => id !== user?.id && onlineIds.includes(id),
                      ) && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card bg-emerald-500"
                          data-testid="thread-online-dot"
                        />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" data-testid="thread-title">
                        {activeThread.title}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground" data-testid="thread-presence">
                        {typingUsers.length > 0 ? (
                          <span className="text-primary" data-testid="typing-indicator">
                            {typingUsers.length === 1
                              ? `${typingUsers[0].name} is typing…`
                              : `${typingUsers.length} people are typing…`}
                          </span>
                        ) : activeThread.kind === "space" ? (
                          `${activeThread.participant_names.length} members · ${
                            activeThread.participant_ids.filter((id) => onlineIds.includes(id)).length
                          } online`
                        ) : activeThread.participant_ids.some(
                            (id) => id !== user?.id && onlineIds.includes(id),
                          ) ? (
                          "Online"
                        ) : (
                          "Direct message"
                        )}
                      </p>
                    </div>
                  </header>

                  <div className="min-h-0 flex-1 overflow-y-auto p-4" data-testid="thread-messages">
                    {(messages.data ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No messages yet — say hello. Mention someone with @their-email to notify them.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {(messages.data ?? []).map((m) => {
                          const mine = m.sender_id === user?.id;
                          return (
                            <div
                              key={m.id}
                              className={cn(
                                "max-w-[72%] rounded-2xl px-3.5 py-2.5",
                                mine
                                  ? "self-end bg-primary/18 text-foreground"
                                  : "self-start bg-secondary text-secondary-foreground",
                              )}
                              data-testid={`message-${m.id}`}
                            >
                              {activeThread.kind === "space" && !mine && (
                                <p className="mb-0.5 text-[10px] font-semibold text-primary">
                                  {m.sender_name}
                                </p>
                              )}
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                                {relative(m.created_at)}
                              </p>
                            </div>
                          );
                        })}
                        <div ref={endRef} />
                      </div>
                    )}
                  </div>

                  <div className="flex items-end gap-2 border-t border-border p-3">
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
                      placeholder="Type a message…"
                      className="min-h-0 resize-none"
                      data-testid="message-input"
                    />
                    <Button
                      size="icon"
                      onClick={submit}
                      disabled={!draft.trim() || send.isPending}
                      aria-label="Send message"
                      data-testid="message-send-button"
                    >
                      {send.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {tab === "mentions" && (
          <div className="mt-4 flex flex-col gap-2" data-testid="mentions-list">
            {(mentions.data ?? []).length === 0 ? (
              <EmptyState
                title="No mentions"
                body="When someone writes @your-email in a conversation you are part of, it lands here."
                testId="mentions-empty-state"
              />
            ) : (
              (mentions.data ?? []).map((m) => (
                <button
                  key={m.message.id}
                  type="button"
                  onClick={() => {
                    setTab("messages");
                    openThread.mutate(m.message.conversation_id);
                  }}
                  className="nv-panel nv-hover-card flex items-start gap-3 rounded-xl px-4 py-3 text-left"
                  data-testid={`mention-${m.message.id}`}
                >
                  <AtSign className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">
                      {m.message.sender_name} in {m.conversation_title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {m.message.body}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {relative(m.message.created_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {tab === "invitations" && (
          <div className="mt-4 flex flex-col gap-2" data-testid="invitations-list">
            {(invitations.data ?? []).length === 0 ? (
              <EmptyState
                title="No pending invitations"
                body="When someone invites your email to their Space, it appears here with Accept and Decline. You can also join with an invite code from the Spaces page."
                testId="invitations-empty-state"
              />
            ) : (
              (invitations.data ?? []).map((inv) => (
                <div
                  key={inv.id}
                  className="nv-panel flex flex-wrap items-center gap-3 rounded-xl px-4 py-3"
                  data-testid={`invitation-${inv.id}`}
                >
                  <MessageSquare className="size-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{inv.space_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {inv.invited_by_name} invited you as {inv.role}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => respond.mutate({ id: inv.id, accept: true })}
                    disabled={respond.isPending}
                    data-testid={`invitation-accept-${inv.id}`}
                  >
                    <Check className="size-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => respond.mutate({ id: inv.id, accept: false })}
                    disabled={respond.isPending}
                    data-testid={`invitation-decline-${inv.id}`}
                  >
                    <X className="size-4" />
                    Decline
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "activity" && (
          <div className="mt-4 flex flex-col gap-2" data-testid="activity-list">
            {(activity.data ?? []).length === 0 ? (
              <EmptyState
                title="Nothing has happened yet"
                body="Space creations, invitations sent and accepted, and mentions are recorded here."
                testId="activity-empty-state"
              />
            ) : (
              (activity.data ?? []).map((a) => (
                <div
                  key={a.id}
                  className="nv-panel flex items-center gap-3 rounded-xl px-4 py-3"
                  data-testid={`activity-${a.id}`}
                >
                  <span className="size-1.5 rounded-full bg-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm">{a.text}</span>
                  <span className="text-[11px] text-muted-foreground">{relative(a.created_at)}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[480px]" data-testid="compose-dialog">
          <DialogHeader>
            <DialogTitle>New message</DialogTitle>
            <DialogDescription>
              Message anyone on Notevoro by their email address, or open the team chat for one of
              your Spaces.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dm-email">Direct message — email</Label>
              <Input
                id="dm-email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="them@example.com"
                data-testid="compose-email-input"
              />
              <Button
                onClick={() => startDirect.mutate()}
                disabled={!inviteEmail.trim() || startDirect.isPending}
                data-testid="compose-direct-submit"
              >
                Start conversation
              </Button>
            </div>
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <Label>Space team chat</Label>
              <Select value={spaceTarget} onValueChange={setSpaceTarget}>
                <SelectTrigger data-testid="compose-space-select">
                  <SelectValue>
                    {(v) =>
                      v === "none"
                        ? "Choose a Space"
                        : (spaces.find((s) => s.id === v)?.name ?? "Choose a Space")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Choose a Space</SelectItem>
                  {spaces.map((s) => (
                    <SelectItem key={s.id} value={s.id} data-testid={`compose-space-${s.id}`}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => startSpace.mutate()}
                disabled={spaceTarget === "none" || startSpace.isPending}
                data-testid="compose-space-submit"
              >
                Open team chat
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setComposeOpen(false)} data-testid="compose-cancel">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
