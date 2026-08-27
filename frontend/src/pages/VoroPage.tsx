import TopBar from "@/components/TopBar";
import { EmptyState } from "@/components/Primitives";
import { useNewSpace } from "@/lib/newSpace";
import { useWorkspace } from "@/lib/workspace";
import { getTemplate } from "@/lib/templates";

export default function VoroPage() {
  const { openNewSpace } = useNewSpace();
  const { activeSpace } = useWorkspace();

  return (
    <>
      <TopBar
        title="Voro"
        subtitle={
          activeSpace
            ? `Assisting inside ${activeSpace.name} · ${getTemplate(activeSpace.templateId).name}`
            : "Global context — all Spaces"
        }
        onNewSpace={openNewSpace}
      />
      <div className="flex-1 overflow-y-auto p-6" data-testid="voro-page">
        <div className="nv-panel nv-glow animate-fade-up rounded-2xl p-6">
          <h2 className="font-heading text-xl font-semibold">Voro is always on the right</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Voro lives in the right-hand panel so it stays available on every screen instead of being
            a separate destination. It automatically takes the current Space as context — switch
            Spaces in the left sidebar and Voro&apos;s context label, suggestions and conversation
            list change with it.
          </p>
        </div>
        <div className="mt-5">
          <EmptyState
            title="Context Voro can see right now"
            body={
              activeSpace
                ? `Only ${activeSpace.name}: its tasks, its events and its Knowledge. Nothing from your other Spaces is sent.`
                : "Everything, deliberately: My Day is the one global context, so Voro aggregates tasks, events and Knowledge across all your Spaces."
            }
            testId="voro-context-explainer"
          />
        </div>
      </div>
    </>
  );
}
