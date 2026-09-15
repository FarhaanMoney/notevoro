/**
 * CollaborativeDocEditor — Tiptap + Yjs editor that syncs through
 * Supabase Realtime broadcasts and persists a Yjs update log to the
 * Notevoro backend (Aurora) so late joiners can bootstrap the CRDT.
 *
 * Design decisions:
 *  - Yjs CRDT is the authoritative shape; conflicts converge deterministically.
 *  - IndexedDB persistence gives offline editing + instant open.
 *  - Local update stream is:
 *      1) broadcast via Supabase (ephemeral, fast)
 *      2) POSTed to backend so it survives channel drops
 *      3) NOT rebroadcast when origin === 'remote'
 *  - Backend membership check + Supabase RLS enforce Space isolation.
 *  - No Liveblocks. No prompt-based sync. No fake presence.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Placeholder from '@tiptap/extension-placeholder';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Awareness } from 'y-protocols/awareness';

import {
  authorizeDocument,
  fetchYjsSnapshot,
  openChannel,
  pushYjsUpdate,
} from '../lib/collab';
import { initCollab, isRealtimeConfigured } from '../lib/supabase';
import { uid } from '../lib/api';

const CURSOR_COLORS = ['#5b43e6', '#22b573', '#f2a531', '#ee5a5a', '#3ba1ff', '#b955e5', '#e05f8f'];
const colorFor = (id) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CURSOR_COLORS[h % CURSOR_COLORS.length];
};

export default function CollaborativeDocEditor({
  documentId,
  user,
  canWrite = true,
  placeholder = 'Start writing…',
  initialContent = '',
  onLocalChange, // (jsonDoc, plainText) => void  — for autosave to Documents.content
  onStatusChange, // (status: 'local'|'connecting'|'live'|'offline') => void
}) {
  const clientId = useMemo(() => uid(), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ydoc = useMemo(() => new Y.Doc(), [documentId]);
  const awareness = useMemo(() => new Awareness(ydoc), [ydoc]);
  const roomRef = useRef(null);
  const bootstrappedRef = useRef(false);
  const [status, setStatus] = useState('local');
  const [persistenceReady, setPersistenceReady] = useState(false);

  // Persist to IndexedDB so edits survive reloads and offline periods.
  // CRITICAL: The editor MUST NOT mount before this resolves, otherwise
  // the y-prosemirror plugin will initialize the binding with an empty
  // ProseMirror doc and immediately publish that empty state into the
  // (freshly-restored) Yjs doc, wiping saved content on reload.
  const localPersistence = useMemo(
    () => new IndexeddbPersistence(`notevoro:yjs:${documentId}`, ydoc),
    [ydoc, documentId]
  );

  useEffect(() => {
    let cancelled = false;
    localPersistence.whenSynced.then(() => {
      if (!cancelled) setPersistenceReady(true);
    }).catch(() => {
      // If IndexedDB is unavailable (private mode, quota), fall back to
      // in-memory-only editing rather than blocking the user forever.
      if (!cancelled) setPersistenceReady(true);
    });
    // Fail-open after 1.5s to avoid stalling the UI on obscure browsers.
    const t = setTimeout(() => { if (!cancelled) setPersistenceReady(true); }, 1500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [localPersistence]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: canWrite,
      extensions: [
        StarterKit.configure({ history: false }), // history handled by Yjs
        Placeholder.configure({ placeholder }),
        Collaboration.configure({ document: ydoc }),
        CollaborationCursor.configure({
          provider: { awareness },
          user: { name: user?.name || 'Guest', color: colorFor(user?.id || clientId) },
        }),
      ],
      onUpdate: ({ editor: ed }) => {
        try {
          const text = ed.getText();
          onLocalChange?.(ed.getJSON(), text);
        } catch {/* noop */}
      },
    },
    [ydoc, awareness, canWrite, placeholder]
  );

  // One-time content seed: only if the Yjs doc is truly empty AFTER
  // IndexedDB has attempted to load. Prevents duplicated content on reload
  // AND prevents overwriting content that was restored from IndexedDB.
  useEffect(() => {
    if (!editor || !persistenceReady) return;
    const yFragment = ydoc.getXmlFragment('default');
    const editorEmpty = editor.state.doc.textContent === '' && editor.state.doc.childCount <= 1
      && editor.state.doc.firstChild?.childCount === 0;
    const yEmpty = yFragment.length === 0;
    if (yEmpty && editorEmpty && initialContent) {
      // Seed with plain-text initial content. Tiptap parses the string as
      // HTML; a bare string becomes <p>string</p> which flows through the
      // y-prosemirror binding into the Yjs doc + IndexedDB.
      editor.commands.setContent(initialContent, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, persistenceReady, initialContent]);

  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);

  // Wire realtime channel + backend snapshot bootstrap.
  useEffect(() => {
    let disposed = false;
    let ydocUpdateHandler = null;
    let awarenessHandler = null;

    (async () => {
      await initCollab();
      if (disposed) return;

      if (!isRealtimeConfigured()) {
        setStatus('local');
        return;
      }

      setStatus('connecting');
      let authz;
      try {
        authz = await authorizeDocument(documentId);
      } catch (e) {
        console.warn('[collab] doc authz failed, staying local', e);
        setStatus('local');
        return;
      }
      if (disposed) return;

      // Bootstrap from durable Aurora snapshot log before subscribing so
      // we don't miss updates that happened before we opened the channel.
      try {
        const updates = await fetchYjsSnapshot(documentId);
        if (!disposed && updates.length) {
          Y.transact(ydoc, () => {
            for (const b64 of updates) {
              try {
                const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                Y.applyUpdate(ydoc, bytes, 'snapshot');
              } catch { /* skip malformed */ }
            }
          });
          bootstrappedRef.current = true;
        }
      } catch (e) {
        console.warn('[collab] snapshot bootstrap failed', e);
      }
      if (disposed) return;

      const room = openChannel(authz.topic, {
        presenceKey: user?.id || clientId,
        onBroadcast: {
          'yjs-update': (payload) => {
            if (!payload?.update || payload.client_id === clientId) return;
            try {
              const bytes = Uint8Array.from(payload.update);
              Y.applyUpdate(ydoc, bytes, 'remote');
            } catch (e) { console.warn('[collab] apply remote update', e); }
          },
          'awareness': (payload) => {
            if (!payload?.update || payload.client_id === clientId) return;
            try {
              const bytes = Uint8Array.from(payload.update);
              // eslint-disable-next-line no-undef
              const applyAwareness = require('y-protocols/awareness').applyAwarenessUpdate;
              applyAwareness(awareness, bytes, 'remote');
            } catch { /* noop */ }
          },
        },
      });

      if (!room) { setStatus('local'); return; }
      roomRef.current = room;
      setStatus('live');

      ydocUpdateHandler = (update, origin) => {
        if (origin === 'remote' || origin === 'snapshot') return;
        const arr = Array.from(update);
        const b64 = typeof window !== 'undefined'
          ? window.btoa(String.fromCharCode.apply(null, update))
          : Buffer.from(update).toString('base64');
        // Broadcast ephemeral update for live peers.
        room.send('yjs-update', { client_id: clientId, update: arr }).catch(() => {});
        // Persist durably so a late joiner can rebuild state.
        pushYjsUpdate(documentId, b64, clientId).catch(() => {});
      };
      ydoc.on('update', ydocUpdateHandler);

      awarenessHandler = () => {
        try {
          const { encodeAwarenessUpdate } = require('y-protocols/awareness');
          const update = encodeAwarenessUpdate(awareness, [awareness.clientID]);
          room.send('awareness', { client_id: clientId, update: Array.from(update) }).catch(() => {});
        } catch { /* noop */ }
      };
      awareness.on('update', awarenessHandler);

      await room.track({
        userId: user?.id,
        clientId,
        name: user?.name || 'Guest',
        documentId,
      }).catch(() => {});

      const onOnline = () => setStatus('live');
      const onOffline = () => setStatus('offline');
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      roomRef.current._netCleanup = () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    })();

    return () => {
      disposed = true;
      if (ydocUpdateHandler) ydoc.off('update', ydocUpdateHandler);
      if (awarenessHandler) awareness.off('update', awarenessHandler);
      const room = roomRef.current;
      if (room) {
        room._netCleanup?.();
        room.close().catch(() => {});
        roomRef.current = null;
      }
    };
  }, [documentId, clientId, ydoc, awareness, user?.id, user?.name]);

  useEffect(() => {
    return () => {
      try { localPersistence.destroy(); } catch { /* noop */ }
      try { awareness.destroy(); } catch { /* noop */ }
      try { ydoc.destroy(); } catch { /* noop */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="nv-tiptap-wrap flex-1 min-h-0 overflow-auto nv-scroll" data-testid="collab-editor">
      <div className="px-10 py-6">
        {!persistenceReady ? (
          <div className="text-[13px] nv-muted animate-pulse" data-testid="collab-editor-loading">Loading editor…</div>
        ) : editor ? (
          <EditorContent editor={editor} className="prose-nv prose-tiptap" />
        ) : (
          <div className="text-[13px] nv-muted animate-pulse" data-testid="collab-editor-loading">Loading editor…</div>
        )}
      </div>
    </div>
  );
}

export function CollabStatusPill({ status }) {
  const map = {
    live: { dot: 'bg-[#22b573]', label: 'Live', title: 'Realtime collaboration on' },
    connecting: { dot: 'bg-[#f2a531] animate-pulse', label: 'Connecting…', title: 'Joining realtime channel' },
    offline: { dot: 'bg-[#f2a531]', label: 'Offline', title: 'You are offline — edits sync when reconnected' },
    local: { dot: 'bg-[#c4b8f4]', label: 'Local', title: 'Realtime not configured — editing locally' },
  };
  const s = map[status] || map.local;
  return (
    <span className="text-[11px] nv-muted flex items-center gap-1.5" title={s.title} data-testid="collab-status">
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
