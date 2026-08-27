import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogIn, Trash2 } from "lucide-react";
import { toast } from "sonner";
import TopBar from "@/components/TopBar";
import { EmptyState } from "@/components/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspace } from "@/lib/workspace";
import { useNewSpace } from "@/lib/newSpace";
import { purgeSpaceData } from "@/lib/repo";
import { deleteSpace, redeemInvite, removeMember } from "@/lib/spacesApi";
import { apiErrorMessage } from "@/lib/auth";
import { getTemplate } from "@/lib/templates";
import { spaceIcon } from "@/components/icons";

export default function Spaces() {
  const { user, spaces, setActiveSpaceId, activeSpaceId } = useWorkspace();
  const { openNewSpace } = useNewSpace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");

  const remove = useMutation({
    mutationFn: async (spaceId: string) => {
      const space = spaces.find((s) => s.id === spaceId);
      // Owners delete the Space for everyone; members simply leave it.
      if (space?.role === "owner") await deleteSpace(spaceId);
      else await removeMember(spaceId, user!.id);
      await purgeSpaceData(user!.id, spaceId);
      return space?.role === "owner";
    },
    onSuccess: (wasOwner, id) => {
      if (id === activeSpaceId) setActiveSpaceId(null);
      void queryClient.invalidateQueries();
      toast.success(wasOwner ? "Space deleted" : "You left the Space");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not remove Space")),
  });

  const join = useMutation({
    mutationFn: () => redeemInvite(code),
    onSuccess: (res) => {
      setCode("");
      void queryClient.invalidateQueries();
      toast.success(res.message);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not join with that code")),
  });

  return (
    <>
      <TopBar title="Spaces" subtitle="Areas of your life and work" onNewSpace={openNewSpace} />
      <div className="flex-1 overflow-y-auto p-6" data-testid="spaces-page">
        <div className="nv-panel mb-5 flex flex-wrap items-end gap-3 rounded-2xl p-4" data-testid="join-space-card">
          <div className="min-w-[220px] flex-1">
            <p className="font-heading text-sm font-semibold">Have an invite code?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Paste the code someone shared with you to join their Space.
            </p>
          </div>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Invite code"
            className="w-[220px]"
            data-testid="join-code-input"
          />
          <Button
            variant="outline"
            onClick={() => join.mutate()}
            disabled={!code.trim() || join.isPending}
            data-testid="join-code-submit"
          >
            <LogIn className="size-4" />
            Join Space
          </Button>
        </div>
        {spaces.length === 0 ? (
          <div className="nv-panel nv-glow animate-fade-up rounded-2xl p-8" data-testid="spaces-welcome">
            <h2 className="font-heading text-2xl font-semibold">Welcome to Notevoro 👋</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              What are you working on? Create your first Space — a template sets up sensible modules
              so you can start working immediately.
            </p>
            <Button className="mt-5" onClick={openNewSpace} data-testid="spaces-create-first-button">
              Create your first Space
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3" data-testid="spaces-grid">
            {spaces.map((s) => {
              const Icon = spaceIcon(s.icon);
              const template = getTemplate(s.templateId);
              return (
                <div
                  key={s.id}
                  className="nv-panel nv-hover-card animate-fade-up rounded-2xl p-5"
                  data-testid={`space-card-${s.id}`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="grid size-10 place-items-center rounded-xl"
                      style={{ background: `color-mix(in oklab, ${s.color} 18%, transparent)` }}
                    >
                      <Icon className="size-5" style={{ color: s.color }} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-heading text-base font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.name} template · you are {s.role}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={s.role === "owner" ? `Delete ${s.name}` : `Leave ${s.name}`}
                      title={s.role === "owner" ? "Delete Space" : "Leave Space"}
                      onClick={() => remove.mutate(s.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      data-testid={`space-delete-${s.id}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {s.modules.slice(0, 6).map((m) => (
                      <span
                        key={m}
                        className="rounded-md bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setActiveSpaceId(s.id);
                      navigate(`/dashboard/spaces/${s.id}`);
                    }}
                    data-testid={`space-open-${s.id}`}
                  >
                    Open Space
                  </Button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={openNewSpace}
              className="grid min-h-[180px] place-items-center rounded-2xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              data-testid="spaces-add-card"
            >
              + New Space
            </button>
          </div>
        )}
        {spaces.length === 0 && (
          <div className="mt-5">
            <EmptyState
              title="Why Spaces?"
              body="A Space keeps its tasks, calendar, Knowledge and Voro conversations isolated from every other Space — while My Day deliberately aggregates across all of them."
              testId="spaces-explainer"
            />
          </div>
        )}
      </div>
    </>
  );
}
