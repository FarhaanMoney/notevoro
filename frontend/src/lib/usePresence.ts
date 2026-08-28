import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getConversationPresence, sendHeartbeat } from "@/lib/presenceApi";

/**
 * Keeps the server informed that this client is alive (and whether the user is typing),
 * and reads back who else is online / typing in the open conversation.
 *
 * Heartbeats are throttled: one every 20s while idle, and at most one every 2s while
 * typing, so holding a key down cannot flood the API.
 */
export function usePresence(conversationId: string | null, draft: string) {
  const lastTypingPing = useRef(0);
  const wasTyping = useRef(false);

  // Idle heartbeat so the online dot stays lit.
  useEffect(() => {
    let cancelled = false;
    const beat = () => {
      if (!cancelled) void sendHeartbeat(conversationId, false).catch(() => undefined);
    };
    beat();
    const timer = window.setInterval(beat, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [conversationId]);

  // Typing signal, throttled, plus an explicit "stopped typing" when the draft empties.
  useEffect(() => {
    if (!conversationId) return;
    const typing = draft.trim().length > 0;
    const now = Date.now();

    if (typing) {
      if (now - lastTypingPing.current > 2000) {
        lastTypingPing.current = now;
        wasTyping.current = true;
        void sendHeartbeat(conversationId, true).catch(() => undefined);
      }
      return;
    }

    if (wasTyping.current) {
      wasTyping.current = false;
      void sendHeartbeat(conversationId, false).catch(() => undefined);
    }
  }, [draft, conversationId]);

  const presence = useQuery({
    queryKey: ["presence", "conversation", conversationId],
    queryFn: () => getConversationPresence(conversationId!),
    enabled: Boolean(conversationId),
    refetchInterval: 4000,
  });

  return {
    onlineIds: presence.data?.online_user_ids ?? [],
    typingUsers: presence.data?.typing ?? [],
  };
}
