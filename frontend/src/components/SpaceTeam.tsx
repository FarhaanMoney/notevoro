import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Mail, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiErrorMessage } from "@/lib/auth";
import {
  inviteToSpace,
  listMembers,
  listSpaceInvitations,
  removeMember,
  updateMemberRole,
} from "@/lib/spacesApi";
import { startSpaceThread } from "@/lib/messagesApi";
import { useWorkspace } from "@/lib/workspace";
import type { Invitation, Role, Space } from "@/types";
import { useNavigate } from "react-router-dom";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  editor: "Editor",
  viewer: "Viewer",
};

const ASSIGNABLE: Role[] = ["editor", "viewer"];

export default function SpaceTeam({ space, label }: { space: Space; label: string }) {
  const { user } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");

  const canManage = space.role === "owner";
  const canInvite = space.role === "owner" || space.role === "editor";

  const members = useQuery({
    queryKey: ["members", space.id],
    queryFn: () => listMembers(space.id),
  });

  const pending = useQuery({
    queryKey: ["space-invitations", space.id],
    queryFn: () => listSpaceInvitations(space.id),
  });

  const refresh = () => {
    // refetchQueries, not invalidateQueries: an invalidation that lands while the first
    // fetch is still in flight gets deduped, and the stale empty result wins.
    void queryClient.refetchQueries({ queryKey: ["members", space.id] });
    void queryClient.refetchQueries({ queryKey: ["space-invitations", space.id] });
  };

  const invite = useMutation({
    mutationFn: (byLink: boolean) => inviteToSpace(space.id, byLink ? null : email.trim(), role),
    onSuccess: (inv) => {
      setEmail("");
      // Show it immediately, then reconcile with the server.
      queryClient.setQueryData<Invitation[]>(["space-invitations", space.id], (prev) => [
        ...(prev ?? []),
        inv,
      ]);
      refresh();
      if (inv.email) {
        toast.success(`Invitation sent to ${inv.email} — it appears in their Inbox`);
      } else {
        void navigator.clipboard?.writeText(inv.code).catch(() => undefined);
        toast.success(`Invite code ${inv.code} created and copied`);
      }
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not send the invitation")),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, next }: { userId: string; next: Role }) =>
      updateMemberRole(space.id, userId, next),
    onSuccess: () => {
      refresh();
      toast.success("Role updated");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update the role")),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => removeMember(space.id, userId),
    onSuccess: (res) => {
      refresh();
      toast.success(res.message);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not remove that member")),
  });

  const openChat = useMutation({
    mutationFn: () => startSpaceThread(space.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["threads"] });
      navigate("/dashboard/inbox");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not open the team chat")),
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]" data-testid="space-team">
      <section className="nv-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-heading text-base font-semibold">{label}</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => openChat.mutate()}
            disabled={openChat.isPending}
            data-testid="space-team-chat-button"
          >
            {openChat.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Open team chat
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-2" data-testid="space-members-list">
          {(members.data ?? []).map((m) => (
            <div
              key={m.user_id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-3.5 py-3"
              data-testid={`space-member-${m.user_id}`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                {m.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.name}
                  {m.user_id === user?.id && (
                    <span className="ml-2 text-[11px] text-muted-foreground">you</span>
                  )}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
              </div>
              {canManage && m.role !== "owner" ? (
                <Select
                  value={m.role}
                  onValueChange={(v: string) =>
                    changeRole.mutate({ userId: m.user_id, next: v as Role })
                  }
                >
                  <SelectTrigger className="w-[120px]" size="sm" data-testid={`member-role-${m.user_id}`}>
                    <SelectValue>{(v) => ROLE_LABEL[v as string]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE.map((r) => (
                      <SelectItem key={r} value={r} data-testid={`member-role-option-${r}`}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                  {ROLE_LABEL[m.role]}
                </span>
              )}
              {canManage && m.role !== "owner" && (
                <button
                  type="button"
                  aria-label={`Remove ${m.name}`}
                  onClick={() => remove.mutate(m.user_id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  data-testid={`member-remove-${m.user_id}`}
                >
                  <UserMinus className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <aside className="flex flex-col gap-5">
        <section className="nv-panel rounded-2xl p-5" data-testid="space-invite-card">
          <h3 className="font-heading text-base font-semibold">Invite people</h3>
          {!canInvite ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Viewers cannot invite people. Ask the Space owner to send an invitation.
            </p>
          ) : (
            <>
              <div className="mt-4 flex flex-col gap-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="them@example.com"
                  data-testid="invite-email-input"
                />
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v: string) => setRole(v as Role)}>
                  <SelectTrigger data-testid="invite-role-select">
                    <SelectValue>{(v) => ROLE_LABEL[v as string]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE.map((r) => (
                      <SelectItem key={r} value={r} data-testid={`invite-role-${r}`}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="mt-4 w-full"
                onClick={() => invite.mutate(false)}
                disabled={!email.trim() || invite.isPending}
                data-testid="invite-email-submit"
              >
                <Mail className="size-4" />
                Send invitation
              </Button>
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() => invite.mutate(true)}
                disabled={invite.isPending}
                data-testid="invite-link-submit"
              >
                <Copy className="size-4" />
                Create invite code
              </Button>
            </>
          )}
        </section>

        <section className="nv-panel rounded-2xl p-5" data-testid="space-pending-invitations">
          <h3 className="font-heading text-base font-semibold">Pending</h3>
          <div className="mt-3 flex flex-col gap-2">
            {(pending.data ?? []).length === 0 ? (
              <EmptyState
                title="Nothing pending"
                body="Invitations you send appear here until they are accepted or declined."
                testId="space-pending-empty"
              />
            ) : (
              (pending.data ?? []).map((inv) => (
                <div
                  key={inv.id}
                  className="rounded-xl border border-border px-3 py-2.5"
                  data-testid={`pending-invite-${inv.id}`}
                >
                  <p className="truncate text-sm">{inv.email ?? "Invite code"}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {ROLE_LABEL[inv.role]} · code
                    <button
                      type="button"
                      className="rounded bg-secondary px-1.5 py-0.5 font-mono transition-colors hover:text-foreground"
                      onClick={() => {
                        void navigator.clipboard?.writeText(inv.code).catch(() => undefined);
                        toast.success("Invite code copied");
                      }}
                      data-testid={`pending-invite-copy-${inv.id}`}
                    >
                      {inv.code}
                    </button>
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
