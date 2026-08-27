import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SPACE_TEMPLATES, getTemplate } from "@/lib/templates";
import { createSpace } from "@/lib/spacesApi";
import { apiErrorMessage } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { spaceIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { TemplateId } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateSpaceDialog({ open, onOpenChange }: Props) {
  const { user, setActiveSpaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<TemplateId>("student");

  const create = useMutation({
    mutationFn: () => {
      const template = getTemplate(templateId);
      return createSpace({
        name,
        templateId,
        icon: template.icon,
        color: template.color,
        modules: [...template.modules],
      });
    },
    onSuccess: async (space) => {
      await queryClient.invalidateQueries({ queryKey: ["spaces", user?.id] });
      setActiveSpaceId(space.id);
      setName("");
      onOpenChange(false);
      toast.success(`${space.name} is ready`);
      navigate(`/dashboard/spaces/${space.id}`);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create Space")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]" data-testid="create-space-dialog">
        <DialogHeader>
          <DialogTitle>Create a Space</DialogTitle>
          <DialogDescription>
            A Space is an area of your life or work. The template sets up sensible modules — you can
            change them later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="space-name">Name</Label>
            <Input
              id="space-name"
              value={name}
              placeholder="University, Startup, Client — ABC…"
              onChange={(e) => setName(e.target.value)}
              data-testid="create-space-name-input"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Template</Label>
            <div className="grid grid-cols-2 gap-2">
              {SPACE_TEMPLATES.map((t) => {
                const Icon = spaceIcon(t.icon);
                const selected = t.id === templateId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplateId(t.id)}
                    className={cn(
                      "nv-hover-card rounded-xl border border-border p-3 text-left",
                      selected && "border-primary/60 bg-primary/10",
                    )}
                    data-testid={`create-space-template-${t.id}`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-4" style={{ color: t.color }} />
                      <span className="text-sm font-medium">{t.name}</span>
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">
                      {t.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="create-space-cancel">
            Cancel
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={!name.trim() || create.isPending}
            data-testid="create-space-submit"
          >
            Create Space
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
