/**
 * Notevoro realtime collaboration helpers.
 *
 * Auth model:
 *  - Frontend calls the backend to `authorize` before subscribing.
 *  - Backend checks Space membership in Aurora and returns the topic name.
 *  - Frontend then subscribes to Supabase Realtime on that exact topic.
 *  - In production, Supabase RLS on `realtime.messages` must mirror
 *    membership (see PRD.md) so IDs cannot be spoofed even if the
 *    frontend is compromised.
 */
import { api } from './api';
import { getSupabase, isRealtimeConfigured } from './supabase';

export async function authorizeSpace(spaceId) {
  const { data } = await api.post(`/collab/spaces/${spaceId}/authorize`);
  return data; // { topic, chat_topic, document_topic_prefix, role }
}

export async function authorizeDocument(documentId) {
  const { data } = await api.post(`/collab/documents/${documentId}/authorize`);
  return data; // { topic, document_id, space_id, can_write }
}

export async function fetchYjsSnapshot(documentId) {
  const { data } = await api.get(`/collab/documents/${documentId}/yjs-snapshot`);
  return data?.updates || [];
}

export async function pushYjsUpdate(documentId, updateB64, clientId) {
  await api.post(`/collab/documents/${documentId}/yjs-update`, {
    update_b64: updateB64,
    client_id: clientId,
  });
}

/**
 * Open a Supabase Realtime channel with typed helpers.
 *
 * Returns `null` if realtime isn't configured (safe no-op for callers).
 */
export function openChannel(topic, { onBroadcast = {}, onPresence, presenceKey } = {}) {
  const sb = getSupabase();
  if (!sb || !isRealtimeConfigured()) return null;
  const channel = sb.channel(topic, {
    config: {
      private: true,
      broadcast: { ack: true, self: false },
      presence: presenceKey ? { key: presenceKey } : {},
    },
  });
  Object.entries(onBroadcast).forEach(([event, handler]) => {
    channel.on('broadcast', { event }, ({ payload }) => {
      try { handler(payload); } catch (e) { console.warn(`[collab] ${event} handler`, e); }
    });
  });
  if (onPresence) {
    const emit = () => onPresence(channel.presenceState());
    channel.on('presence', { event: 'sync' }, emit);
    channel.on('presence', { event: 'join' }, emit);
    channel.on('presence', { event: 'leave' }, emit);
  }
  channel.subscribe();
  return {
    channel,
    async send(event, payload) {
      return channel.send({ type: 'broadcast', event, payload });
    },
    async track(state) {
      return channel.track(state);
    },
    async close() {
      const supa = getSupabase();
      if (supa) await supa.removeChannel(channel);
    },
  };
}

export const collabStatus = () => (isRealtimeConfigured() ? 'live' : 'local');
