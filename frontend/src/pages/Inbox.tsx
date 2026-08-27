import TopBar from "@/components/TopBar";
import { EmptyState } from "@/components/Primitives";
import { useNewSpace } from "@/lib/newSpace";
import { useWorkspace } from "@/lib/workspace";

export default function Inbox() {
  const { openNewSpace } = useNewSpace();
  const { user } = useWorkspace();

  return (
    <>
      <TopBar title="Inbox" subtitle="Messages, mentions and activity" onNewSpace={openNewSpace} />
      <div className="flex-1 overflow-y-auto p-6" data-testid="inbox-page">
        <EmptyState
          title="Messaging arrives in the communication phase"
          body={`Your messaging identifier is ${user?.email}. Conversations, Space members, invitations and mentions are part of Phase 4 and are not built yet — rather than show buttons that do nothing, this page states it plainly. The conversation/participant/message model already exists in the storage layer that Voro uses.`}
          testId="inbox-empty-state"
        />
      </div>
    </>
  );
}
