import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Icon, SpaceIcon, Avatar } from '../lib/icons';
import { useApp } from '../lib/store';

/**
 * The ONE Notevoro Send Composer. Reused by:
 *   * Brain Inbox → Compose
 *   * Document / Note / Page / Project / File → Send
 *   * Chat → Send as Mail
 *
 * Required inputs:
 *   - Recipients (must be reachable — server validates)
 *   - Source Space (auto-selected when opened from an object or a Space)
 *   - Optional subject + body
 *   - Optional attached object (object_type + object_id, permission)
 *
 * The composer never exposes users the sender cannot reach. The final send
 * is authorized server-side (/api/v1/inbox/compose).
 */
export default function SendComposer({
  open,
  onClose,
  presetSpaceId = null,   // if opened from inside a Space or an object
  object = null,          // { type, id, title } — makes this a "Share/Send object" flow
  lockSourceSpace = false,
}) {
  const me = useApp((s) => s.user);
  const { data: spaces = [] } = useQuery({
    queryKey: ['spaces'],
    queryFn: () => api.get('/spaces').then((r) => r.data),
    enabled: open,
  });
  const [sourceSpaceId, setSourceSpaceId] = useState(presetSpaceId || '');
  const [recipients, setRecipients] = useState([]); // [{id,name,email,avatar_url}]
  const [subject, setSubject] = useState(object?.title || '');
  const [body, setBody] = useState('');
  const [permission, setPermission] = useState('viewer');
  const [q, setQ] = useState('');

  useEffect(() => {
    if (open) {
      setSourceSpaceId(presetSpaceId || '');
      setRecipients([]);
      setSubject(object?.title || '');
      setBody('');
      setPermission('viewer');
      setQ('');
    }
  }, [open, presetSpaceId, object?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentSpace = useMemo(() => spaces.find((s) => s.id === sourceSpaceId), [spaces, sourceSpaceId]);

  const { data: searchRes } = useQuery({
    queryKey: ['recipients', q, sourceSpaceId],
    queryFn: () => api.get('/inbox/recipients/search', { params: { q, source_space_id: sourceSpaceId || undefined } }).then((r) => r.data),
    enabled: open,
    keepPreviousData: true,
  });

  const send = useMutation({
    mutationFn: (payload) => api.post('/inbox/compose', payload).then((r) => r.data),
    onSuccess: (data) => {
      const delivered = data?.delivered?.length || 0;
      const skipped = data?.skipped?.length || 0;
      if (delivered) {
        toast.success(`Sent to ${delivered} ${delivered === 1 ? 'person' : 'people'}${skipped ? ` · ${skipped} unreachable` : ''}`);
        onClose?.(true);
      } else if (skipped) {
        toast.error(`Nobody reachable — ${skipped} recipient${skipped === 1 ? '' : 's'} skipped`);
      } else {
        toast.success('Sent');
        onClose?.(true);
      }
    },
    onError: (e) => toast.error(e?.message || 'Failed to send'),
  });

  const canSend = sourceSpaceId && recipients.length > 0 && (object || subject || body);

  const submit = () => {
    if (!canSend) return;
    const payload = {
      source_space_id: sourceSpaceId,
      recipient_ids: recipients.map((r) => r.id),
      subject: subject || null,
      body: body || null,
    };
    if (object?.id && object?.type) {
      payload.object_type = object.type;
      payload.object_id = object.id;
      payload.permission = permission;
    }
    send.mutate(payload);
  };

  const toggleRecipient = (u) => {
    setRecipients((prev) => (prev.find((x) => x.id === u.id) ? prev.filter((x) => x.id !== u.id) : [...prev, u]));
    setQ('');
  };

  if (!open) return null;
  const items = searchRes?.items || [];

  return (
    <div className="fixed inset-0 z-[90] bg-black/25 backdrop-blur-[3px] grid place-items-center px-4" onClick={() => onClose?.(false)} data-testid="send-composer">
      <div className="bg-white w-full max-w-[560px] rounded-2xl shadow-2xl border border-black/5 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-[var(--nv-border)]">
          <div className="grid place-items-center w-9 h-9 rounded-lg bg-[#f3f2fa] text-[#5b43e6]"><Icon name="send" size={16} /></div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-extrabold tracking-tight">{object ? `Send ${object.title || 'this'}` : 'New message'}</div>
            <div className="text-[11.5px] nv-muted">{object ? `${object.type} · Notevoro` : 'Notevoro Mail'}</div>
          </div>
          <button className="nv-btn nv-btn-ghost w-8 px-0" onClick={() => onClose?.(false)} aria-label="Close" data-testid="send-close"><Icon name="x" size={16} /></button>
        </div>

        {/* From Space */}
        <div className="px-5 py-2.5 flex items-center gap-3 border-b border-[var(--nv-border)]">
          <div className="text-[11.5px] font-semibold nv-muted w-16 shrink-0">From Space</div>
          {lockSourceSpace && currentSpace ? (
            <div className="flex items-center gap-2" data-testid="send-source-locked">
              <SpaceIcon icon={currentSpace.icon} accent={currentSpace.accent} size={22} radius={6} />
              <span className="text-[13px] font-bold">{currentSpace.name}</span>
              <span className="nv-tag tone-violet ml-1 capitalize">{currentSpace.type}</span>
            </div>
          ) : (
            <select className="nv-input h-8 text-[13px] flex-1" value={sourceSpaceId} onChange={(e) => setSourceSpaceId(e.target.value)} data-testid="send-source-select">
              <option value="">Select Source Space...</option>
              {spaces.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.type}</option>)}
            </select>
          )}
        </div>

        {/* To */}
        <div className="px-5 py-2.5 border-b border-[var(--nv-border)]">
          <div className="flex items-center gap-3">
            <div className="text-[11.5px] font-semibold nv-muted w-16 shrink-0">To</div>
            <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-8">
              {recipients.map((r) => (
                <span key={r.id} className="inline-flex items-center gap-1.5 bg-[#f3f2fa] rounded-full pl-1 pr-2 py-0.5 text-[12px] font-semibold">
                  <Avatar user={r} size={18} />
                  {r.name}
                  <button onClick={() => toggleRecipient(r)} className="nv-faint hover:text-black" aria-label="Remove"><Icon name="x" size={11} /></button>
                </span>
              ))}
              <input className="outline-none bg-transparent flex-1 min-w-[120px] text-[13px]" placeholder={recipients.length ? '' : 'Search people...'} value={q} onChange={(e) => setQ(e.target.value)} data-testid="send-recipient-input" />
            </div>
          </div>
          {q.trim() && items.length > 0 && (
            <div className="mt-2 max-h-[180px] overflow-auto nv-scroll border border-[var(--nv-border)] rounded-lg">
              {items.filter((u) => !recipients.find((r) => r.id === u.id)).slice(0, 8).map((u) => (
                <button key={u.id} onClick={() => toggleRecipient(u)} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#f7f6fd] text-left" data-testid={`send-recipient-${u.id}`}>
                  <Avatar user={u} size={26} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate">{u.name}</div>
                    <div className="text-[11px] nv-muted truncate">{u.email}</div>
                  </div>
                  {u.in_source_space && <span className="nv-tag tone-violet text-[9.5px]">in Space</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subject (only if no attached object OR to override) */}
        {!object && (
          <div className="px-5 py-2.5 border-b border-[var(--nv-border)]">
            <input className="w-full outline-none bg-transparent text-[14.5px] font-bold placeholder-gray-400" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="send-subject" />
          </div>
        )}

        {/* Body */}
        <div className="px-5 py-3">
          <textarea className="w-full outline-none bg-transparent text-[13.5px] resize-none min-h-[120px] placeholder-gray-400" placeholder={object ? 'Add a message... (optional)' : 'Write your message...'} value={body} onChange={(e) => setBody(e.target.value)} data-testid="send-body" />
        </div>

        {/* Attached object */}
        {object && (
          <div className="mx-5 mb-3 border border-[var(--nv-border)] rounded-xl p-3 flex items-center gap-3 bg-[#faf9ff]">
            <div className="stat-icon tone-violet" style={{ width: 32, height: 32 }}><Icon name={objectIcon(object.type)} size={15} /></div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-bold truncate">{object.title || 'Untitled'}</div>
              <div className="text-[11px] nv-muted capitalize">{object.type}</div>
            </div>
            <select className="nv-input h-7 text-[11.5px] w-[86px]" value={permission} onChange={(e) => setPermission(e.target.value)} data-testid="send-permission">
              <option value="viewer">Can view</option>
              <option value="editor">Can edit</option>
            </select>
          </div>
        )}

        <div className="px-5 py-3 border-t border-[var(--nv-border)] flex items-center gap-2">
          <span className="text-[11px] nv-muted">{sourceSpaceId ? '' : 'Select a Source Space to send'}</span>
          <button className="nv-btn nv-btn-ghost ml-auto" onClick={() => onClose?.(false)} data-testid="send-cancel">Cancel</button>
          <button className="nv-btn nv-btn-primary" disabled={!canSend || send.isPending} onClick={submit} data-testid="send-submit">
            {send.isPending ? 'Sending...' : <>Send <Icon name="send" size={13} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function objectIcon(type) {
  return {
    page: 'file-stack', document: 'file', note: 'file-text', project: 'layers',
    task: 'check-square', file: 'folder', meeting: 'video',
  }[type] || 'file';
}
