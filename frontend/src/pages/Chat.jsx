import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { api, uid } from '../lib/api';
import { useApp } from '../lib/store';
import { onEvent, sendEvent } from '../lib/ws';
import { Avatar, Icon, SpaceIcon } from '../lib/icons';
import { ago, Empty, ErrorState, fmtTime, Loading } from '../lib/ui';
import { useSpace } from './SpaceShell';
import SendComposer from '../components/SendComposer';

const FILE_TONE = (n = '') => (/\.(xlsx|csv)$/i.test(n) ? 'green' : /\.pdf$/i.test(n) ? 'red' : /\.(png|jpg|jpeg|gif|webp)$/i.test(n) ? 'pink' : 'blue');

export default function Chat({ inbox }) {
  const { spaceId, space } = useSpace();
  const { convId } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const user = useApp((s) => s.user);
  const presence = useApp((s) => s.presence);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showInfo, setShowInfo] = useState(true);
  const { data: convs = [], isLoading, error, refetch } = useQuery({ queryKey: ['conversations', spaceId], queryFn: () => api.get('/conversations', { params: { space_id: spaceId } }).then((r) => r.data) });
  const current = convs.find((c) => c.id === convId);
  useEffect(() => { if (!convId && convs.length && !params.get('new')) nav(`/dashboard/spaces/${spaceId}/chat/${convs[0].id}`, { replace: true }); }, [convId, convs, spaceId, nav, params]);
  const filtered = convs.filter((c) => (tab === 'all' || (tab === 'dms' && c.type === 'direct') || (tab === 'teams' && c.type === 'group') || (tab === 'spaces' && c.type === 'space')) && (!search || (c.title || '').toLowerCase().includes(search.toLowerCase())));
  const pinned = filtered.filter((c) => c.pinned);
  const groups = [['Pinned', pinned], ['Direct Messages', filtered.filter((c) => c.type === 'direct' && !c.pinned)], ['Teams', filtered.filter((c) => c.type === 'group' && !c.pinned)], ['Spaces', filtered.filter((c) => c.type === 'space' && !c.pinned)]];
  return (
    <div className="flex h-screen" data-testid="chat-page">
      <div className="w-[300px] shrink-0 border-r border-[var(--nv-border)] flex flex-col bg-white">
        <div className="h-[var(--header-h)] px-4 flex items-center justify-between"><h1 className="text-[20px] font-extrabold">{inbox ? 'Inbox' : 'Chat'}</h1><button className="nv-btn nv-btn-soft w-9 px-0" onClick={() => setParams({ new: '1' })} aria-label="New conversation" data-testid="chat-new-button"><Icon name="square-pen" size={16} /></button></div>
        <div className="px-4"><div className="relative"><Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 nv-faint" /><input className="nv-input pl-8 h-9" placeholder="Search conversations…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="chat-search-input" /></div>
          <div className="flex gap-1 mt-3">{[['all', 'All'], ['dms', 'DMs'], ['teams', 'Teams'], ['spaces', 'Spaces']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`text-[12px] font-semibold px-3 py-1 rounded-md ${tab === k ? 'bg-[#eeebfe] text-[#5b43e6]' : 'nv-muted hover:bg-[#f3f2fa]'}`} data-testid={`chat-tab-${k}`}>{l}</button>)}</div></div>
        <div className="flex-1 overflow-auto nv-scroll px-2 mt-3 pb-3">
          {isLoading && <Loading />}{error && <ErrorState error={error} onRetry={refetch} compact />}
          {!isLoading && !convs.length && <Empty icon="message-circle" title="No conversations yet" hint="Start a direct message with a teammate." action={<button className="nv-btn nv-btn-primary nv-btn-sm" onClick={() => setParams({ new: '1' })} data-testid="chat-empty-new">New conversation</button>} />}
          {groups.map(([label, list]) => list.length > 0 && (
            <div key={label} className="mb-2"><div className="px-2 py-1.5 text-[13px] font-bold">{label}</div>
              {list.map((c) => <ConvRow key={c.id} c={c} active={c.id === convId} presence={presence} onClick={() => nav(`/dashboard/spaces/${spaceId}/chat/${c.id}`)} />)}</div>
          ))}
        </div>
      </div>
      {params.get('new') ? <NewConversation spaceId={spaceId} onDone={(c) => { setParams({}); qc.invalidateQueries({ queryKey: ['conversations'] }); nav(`/dashboard/spaces/${spaceId}/chat/${c.id}`); }} onCancel={() => setParams({})} />
        : current ? <Thread key={current.id} conv={current} user={user} presence={presence} showInfo={showInfo} setShowInfo={setShowInfo} spaceId={spaceId} space={space} />
        : <div className="flex-1 grid place-items-center"><Empty icon="messages-square" title="Select a conversation" hint="Your messages are stored durably and delivered in real time." /></div>}
    </div>
  );
}

function ConvRow({ c, active, presence, onClick }) {
  const peer = c.peer;
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-colors ${active ? 'bg-[#eeebfe]' : 'hover:bg-[#f7f6fd]'}`} data-testid={`conversation-${c.id}`}>
      {c.type === 'direct' ? <Avatar user={peer} size={38} online={presence.has(peer?.id)} /> : <SpaceIcon icon={c.icon || (c.type === 'group' ? 'users' : 'sparkles')} accent={c.accent || (c.type === 'group' ? 'pink' : 'violet')} size={38} radius={11} />}
      <div className="flex-1 min-w-0"><div className="flex items-center justify-between"><span className={`text-[13px] font-bold truncate ${active ? 'text-[#5b43e6]' : ''}`}>{c.title || 'Conversation'}</span><span className="text-[10.5px] nv-faint shrink-0 ml-2">{c.last_message_at ? (dayjs(c.last_message_at).isSame(dayjs(), 'day') ? fmtTime(c.last_message_at) : dayjs(c.last_message_at).isAfter(dayjs().subtract(6, 'day')) ? dayjs(c.last_message_at).format('dddd') : dayjs(c.last_message_at).format('MMM D')) : ''}</span></div>
        <div className="flex items-center justify-between"><span className="text-[12px] nv-muted truncate">{c.last_message_preview || (c.type === 'space' ? `${c.type === 'space' ? 'Team' : ''} Space` : 'No messages yet')}</span>{c.unread > 0 && <span className="ml-2 bg-[#6e56f5] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center" data-testid="conversation-unread">{c.unread}</span>}</div></div>
    </button>
  );
}

function Thread({ conv, user, presence, showInfo, setShowInfo, spaceId, space }) {
  const [sendMailOpen, setSendMailOpen] = useState(false);
  const qc = useQueryClient();
  const nav = useNavigate();
  const typingMap = useApp((s) => s.typing[conv.id]);
  const typing = typingMap || {};
  const typingCount = Object.keys(typing).length;
  const [msgs, setMsgs] = useState([]);
  const [readMarks, setReadMarks] = useState({});
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [status, setStatus] = useState('loading');
  const [err, setErr] = useState(null);
  const bottom = useRef();
  const fileRef = useRef();
  const typingTimer = useRef();
  const peer = conv.peer;
  const load = async () => {
    setStatus('loading'); setErr(null);
    try { const { data } = await api.get(`/conversations/${conv.id}/messages`); setMsgs(data.messages); setReadMarks(data.read_marks); setStatus('ready'); await api.post(`/conversations/${conv.id}/read`); qc.invalidateQueries({ queryKey: ['conversations'] }); }
    catch (e) { setErr(e); setStatus('error'); }
  };
  useEffect(() => { load(); }, [conv.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => onEvent((event, p) => {
    if (p.conversation_id !== conv.id) return;
    if (event === 'message.created') { setMsgs((m) => (m.some((x) => x.id === p.message.id || (x.client_id && x.client_id === p.message.client_id)) ? m.map((x) => (x.id === p.message.id || x.client_id === p.message.client_id ? p.message : x)) : [...m, p.message])); if (p.message.sender_id !== user.id) api.post(`/conversations/${conv.id}/read`); }
    if (event === 'message.updated') setMsgs((m) => m.map((x) => (x.id === p.message.id ? p.message : x)));
    if (event === 'message.status') setMsgs((m) => m.map((x) => (x.id === p.message_id ? { ...x, status: p.status } : x)));
    if (event === 'conversation.read' && p.user_id !== user.id) setReadMarks((r) => ({ ...r, [p.user_id]: p.read_at }));
  }), [conv.id, user.id]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [msgs.length, typingCount]);
  const send = async () => {
    const content = text.trim();
    if (!content && !pendingFile) return;
    const client_id = uid();
    let attachments = [];
    setText('');
    const optimistic = { id: `tmp-${client_id}`, client_id, sender_id: user.id, sender: user, content, attachments: pendingFile ? [{ name: pendingFile.name, size: pendingFile.size }] : [], reactions: {}, status: 'sending', created_at: new Date().toISOString() };
    setMsgs((m) => [...m, optimistic]);
    try {
      if (pendingFile) {
        const fd = new FormData(); fd.append('file', pendingFile);
        const { data: f } = await api.post(`/spaces/${spaceId}/files`, fd);
        attachments = [{ file_id: f.id, name: f.name, size: f.size, content_type: f.content_type, url: f.url, space_id: spaceId }];
        setPendingFile(null);
      }
      const { data } = await api.post(`/conversations/${conv.id}/messages`, { content, client_id, attachments });
      setMsgs((m) => m.map((x) => (x.client_id === client_id ? data : x)));
      qc.invalidateQueries({ queryKey: ['conversations'] });
    } catch (e) {
      setMsgs((m) => m.map((x) => (x.client_id === client_id ? { ...x, status: 'failed', error: e.message } : x)));
    }
  };
  const retry = async (m) => { setMsgs((ms) => ms.map((x) => (x.id === m.id ? { ...x, status: 'sending' } : x))); try { const { data } = await api.post(`/conversations/${conv.id}/messages`, { content: m.content, client_id: m.client_id, attachments: m.attachments }); setMsgs((ms) => ms.map((x) => (x.id === m.id ? data : x))); } catch (e) { setMsgs((ms) => ms.map((x) => (x.id === m.id ? { ...x, status: 'failed' } : x))); } };
  const onType = (v) => { setText(v); sendEvent('typing', { conversation_id: conv.id, typing: true }); clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => sendEvent('typing', { conversation_id: conv.id, typing: false }), 1800); };
  const react = (m, emoji) => api.post(`/conversations/${conv.id}/messages/${m.id}/reactions`, { emoji }).catch((e) => toast.error(e.message));
  const del = (m) => api.delete(`/conversations/${conv.id}/messages/${m.id}`).catch((e) => toast.error(e.message));
  const others = conv.members.filter((m) => m.id !== user.id);
  const lastSeenByOthers = (m) => others.some((o) => readMarks[o.id] && dayjs(readMarks[o.id]).isAfter(dayjs(m.created_at).subtract(1, 'second')));
  const lastMine = [...msgs].reverse().find((m) => m.sender_id === user.id);
  const sharedFiles = msgs.flatMap((m) => m.attachments || []);
  let lastDay = null;
  return (
    <>
      <div className="flex-1 flex flex-col min-w-0 bg-white" data-testid="chat-thread">
        <div className="h-[var(--header-h)] px-5 flex items-center gap-3 border-b border-[var(--nv-border)]">
          {conv.type === 'direct' ? <Avatar user={peer} size={40} /> : <SpaceIcon icon={conv.icon || 'users'} accent={conv.accent || 'pink'} size={40} radius={12} />}
          <div className="flex-1 min-w-0"><div className="font-bold text-[15px] truncate" data-testid="thread-title">{conv.title}</div>
            <div className="text-[11.5px] flex items-center gap-1.5">{conv.type === 'direct' ? (presence.has(peer?.id) ? <><span className="w-1.5 h-1.5 rounded-full bg-[#22b573]" /><span className="text-[#1d9e63] font-semibold">Online</span></> : <span className="nv-muted">Offline</span>) : <span className="nv-muted">{conv.members.length} members · {conv.members.filter((m) => presence.has(m.id)).length} online</span>}</div></div>
          <div className="flex items-center gap-1">{['phone', 'video', 'search'].map((i) => <button key={i} className="nv-btn nv-btn-ghost w-9 px-0" aria-label={i} onClick={() => toast.info(i === 'search' ? 'Use the search box in the conversation list.' : 'Calls run through Meetings — schedule one with Zoom, Meet or Teams.')} data-testid={`thread-${i}`}><Icon name={i} size={16} /></button>)}<button className="nv-btn nv-btn-soft h-8 px-2.5" onClick={() => setSendMailOpen(true)} aria-label="Send as Mail" data-testid="thread-send-mail"><Icon name="send" size={13} /> Mail</button><button className="nv-btn nv-btn-ghost w-9 px-0" onClick={() => setShowInfo(!showInfo)} aria-label="Details" data-testid="thread-info-toggle"><Icon name="more-vertical" size={16} /></button></div>
        </div>
        <div className="flex-1 overflow-auto nv-scroll px-5 py-4" data-testid="message-list">
          {status === 'loading' && <Loading label="Loading messages…" />}{status === 'error' && <ErrorState error={err} onRetry={load} compact />}
          {status === 'ready' && !msgs.length && <Empty icon="message-circle" title="Say hello" hint={`This is the beginning of your conversation${conv.type === 'direct' ? ` with ${conv.title}` : ''}.`} />}
          {msgs.map((m) => {
            const day = dayjs(m.created_at).format('YYYY-MM-DD'); const showDay = day !== lastDay; lastDay = day; const mine = m.sender_id === user.id;
            return (
              <div key={m.id}>
                {showDay && <div className="flex items-center gap-3 my-4"><div className="flex-1 h-px bg-[var(--nv-border)]" /><span className="text-[11.5px] nv-muted font-semibold">{dayjs(m.created_at).isSame(dayjs(), 'day') ? 'Today' : dayjs(m.created_at).isSame(dayjs().subtract(1, 'day'), 'day') ? 'Yesterday' : dayjs(m.created_at).format('MMMM D')}</span><div className="flex-1 h-px bg-[var(--nv-border)]" /></div>}
                <div className={`group flex gap-3 mb-4 ${mine ? 'flex-row-reverse' : ''}`} data-testid={`message-${mine ? 'mine' : 'theirs'}`}>
                  <Avatar user={m.sender} size={36} />
                  <div className={`max-w-[62%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={`flex items-center gap-2 mb-1 ${mine ? 'flex-row-reverse' : ''}`}>{!mine && <span className="text-[13px] font-bold">{m.sender?.name}</span>}<span className="text-[11px] nv-faint">{fmtTime(m.created_at)}</span>{m.edited_at && <span className="text-[10px] nv-faint">edited</span>}</div>
                    {m.deleted_at ? <div className="text-[12.5px] italic nv-faint">Message deleted</div> : (
                      <div className={`px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words ${mine ? 'bubble-me' : 'bubble-them'}`}>{m.content}
                        {(m.attachments || []).map((a, i) => <a key={i} href={a.url ? `${process.env.REACT_APP_BACKEND_URL}${a.url}` : undefined} target="_blank" rel="noreferrer" className={`mt-2 flex items-center gap-3 rounded-xl p-2.5 ${mine ? 'bg-white/15' : 'bg-white border border-[var(--nv-border)]'}`} data-testid="message-attachment"><div className={`stat-icon tone-${FILE_TONE(a.name)}`} style={{ width: 34, height: 34 }}><Icon name="file-text" size={15} /></div><div className="min-w-0 flex-1"><div className="text-[12.5px] font-bold truncate">{a.name}</div><div className={`text-[11px] ${mine ? 'text-white/70' : 'nv-muted'}`}>{(a.size / 1024 / 1024).toFixed(1)} MB</div></div><Icon name="external-link" size={13} className={mine ? 'text-white/70' : 'nv-faint'} /></a>)}
                      </div>)}
                    <div className={`flex items-center gap-2 mt-1 ${mine ? 'flex-row-reverse' : ''}`}>
                      {Object.entries(m.reactions || {}).map(([e, us]) => <button key={e} onClick={() => react(m, e)} className={`text-[11px] px-1.5 py-0.5 rounded-full border ${us.includes(user.id) ? 'border-[#c9bffb] bg-[#f4f2ff]' : 'border-[var(--nv-border)] bg-white'}`} data-testid="message-reaction">{e} {us.length}</button>)}
                      {mine && m.id === lastMine?.id && !m.deleted_at && <span className="text-[11px] nv-muted flex items-center gap-1" data-testid="message-status">{m.status === 'sending' ? <><Icon name="clock" size={11} /> Sending</> : m.status === 'failed' ? <button className="text-[#ee5a5a] font-semibold flex items-center gap-1" onClick={() => retry(m)} data-testid="message-retry"><Icon name="alert-circle" size={11} /> Failed · Retry</button> : lastSeenByOthers(m) ? <><Icon name="check-check" size={12} className="text-[#6e56f5]" /> Seen {fmtTime(readMarks[others[0]?.id])}</> : m.status === 'delivered' ? <><Icon name="check-check" size={12} /> Delivered</> : <><Icon name="check" size={12} /> Sent</>}</span>}
                      {!m.deleted_at && !m.id.startsWith('tmp-') && <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">{['👍', '❤️', '🎉'].map((e) => <button key={e} className="text-[12px] w-6 h-6 rounded hover:bg-[#f3f2fa]" onClick={() => react(m, e)} data-testid="reaction-quick">{e}</button>)}{mine && <button className="w-6 h-6 rounded hover:bg-[#fde7e7] text-[#ee5a5a] grid place-items-center" onClick={() => del(m)} data-testid="message-delete"><Icon name="trash-2" size={12} /></button>}</div>}
                    </div>
                  </div>
                </div>
              </div>);
          })}
          {Object.values(typing).length > 0 && <div className="text-[12px] nv-muted flex items-center gap-2 ml-12" data-testid="typing-indicator"><span className="flex gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-[#a3a0b8] pulse-dot" /><span className="w-1.5 h-1.5 rounded-full bg-[#a3a0b8] pulse-dot" style={{ animationDelay: '.2s' }} /><span className="w-1.5 h-1.5 rounded-full bg-[#a3a0b8] pulse-dot" style={{ animationDelay: '.4s' }} /></span>{Object.values(typing).join(', ')} typing…</div>}
          <div ref={bottom} />
        </div>
        <div className="px-5 pb-4">
          {pendingFile && <div className="flex items-center gap-2 text-xs nv-muted mb-2 px-2" data-testid="pending-attachment"><Icon name="paperclip" size={12} /> {pendingFile.name} <button onClick={() => setPendingFile(null)} className="nv-faint hover:text-[#ee5a5a]"><Icon name="x" size={12} /></button></div>}
          <div className="nv-card flex items-center gap-1 pl-2 pr-2 py-1.5 focus-within:border-[#c9bffb]">
            <input type="file" ref={fileRef} className="hidden" onChange={(e) => setPendingFile(e.target.files[0])} data-testid="chat-file-input" />
            <button className="nv-btn nv-btn-ghost w-8 px-0" onClick={() => fileRef.current.click()} aria-label="Attach" data-testid="chat-attach-button"><Icon name="paperclip" size={16} /></button>
            <button className="nv-btn nv-btn-ghost w-8 px-0" onClick={() => setText((t) => t + ' 🙂')} aria-label="Emoji" data-testid="chat-emoji-button"><Icon name="smile" size={16} /></button>
            <button className="nv-btn nv-btn-ghost w-8 px-0" onClick={() => nav(`/dashboard/spaces/${spaceId}/tasks?new=1&title=${encodeURIComponent(text)}`)} aria-label="Turn into task" data-testid="chat-task-button"><Icon name="square-check" size={16} /></button>
            <input value={text} onChange={(e) => onType(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Type a message…" className="flex-1 bg-transparent outline-none text-[13.5px] px-2 h-9" data-testid="chat-message-input" />
            <button onClick={send} disabled={!text.trim() && !pendingFile} className="nv-btn nv-btn-primary w-10 px-0 rounded-xl" aria-label="Send" data-testid="chat-send-button"><Icon name="send" size={16} /></button>
          </div>
        </div>
      </div>
      {showInfo && <InfoPanel conv={conv} peer={peer} presence={presence} space={space} spaceId={spaceId} files={sharedFiles} msgs={msgs} onClose={() => setShowInfo(false)} />}
      <SendComposer open={sendMailOpen} onClose={() => setSendMailOpen(false)} presetSpaceId={spaceId} lockSourceSpace />
    </>
  );
}

function InfoPanel({ conv, peer, presence, space, spaceId, files, msgs, onClose }) {
  const nav = useNavigate();
  const { data: meetings = [] } = useQuery({ queryKey: ['calendar_events', spaceId], queryFn: () => api.get(`/spaces/${spaceId}/events`).then((r) => r.data) });
  const upcoming = meetings.filter((e) => e.kind === 'meeting' && dayjs(e.start_at).isAfter(dayjs())).slice(0, 2);
  const recent = [...msgs].reverse().filter((m) => m.sender_id !== undefined).slice(0, 3);
  return (
    <aside className="w-[320px] shrink-0 border-l border-[var(--nv-border)] bg-white flex flex-col" data-testid="chat-info-panel">
      <div className="h-[var(--header-h)] flex items-center justify-end px-4"><button className="nv-btn nv-btn-ghost w-8 px-0" onClick={onClose} aria-label="Close" data-testid="chat-info-close"><Icon name="x" size={16} /></button></div>
      <div className="flex-1 overflow-auto nv-scroll px-5 pb-5 space-y-5">
        <div className="flex items-center gap-3">{conv.type === 'direct' ? <Avatar user={peer} size={56} online={presence.has(peer?.id)} /> : <SpaceIcon icon={conv.icon || 'users'} accent={conv.accent || 'pink'} size={56} radius={16} />}<div><div className="font-bold text-[16px]">{conv.title}</div>{conv.type === 'direct' ? <><div className="text-[11.5px] flex items-center gap-1.5 mt-0.5"><span className={`w-1.5 h-1.5 rounded-full ${presence.has(peer?.id) ? 'bg-[#22b573]' : 'bg-[#c8c6d8]'}`} /> {presence.has(peer?.id) ? 'Online' : 'Offline'}</div><div className="text-[11.5px] nv-muted">{peer?.title || 'Member'} · {space.name}</div></> : <div className="text-[11.5px] nv-muted">{conv.members.length} members</div>}</div></div>
        <div className="flex items-center gap-3">{['phone', 'video', 'message-circle'].map((i) => <button key={i} className="w-10 h-10 rounded-xl bg-[#f4f2ff] text-[#6e56f5] grid place-items-center hover:bg-[#e9e5fb]" aria-label={i} onClick={() => i !== 'message-circle' && nav(`/dashboard/spaces/${spaceId}/meetings?new=1`)}><Icon name={i} size={16} /></button>)}<button className="ml-auto nv-btn nv-btn-ghost w-8 px-0"><Icon name="more-horizontal" size={16} /></button></div>
        {conv.type === 'direct' && <div><div className="font-bold text-[13.5px] mb-1.5">About</div><div className="text-[12.5px] nv-muted leading-relaxed">{peer?.bio || 'No bio yet.'}</div>
          <div className="mt-3 space-y-2 text-[12px]">{[['Email', peer?.email, 'mail'], ['Location', peer?.location, 'map-pin'], ['Timezone', peer?.timezone, 'globe']].filter(([, v]) => v).map(([k, v, i]) => <div key={k} className="flex items-center justify-between"><span className="nv-muted flex items-center gap-1.5"><Icon name={i} size={12} /> {k}</span><span className="font-semibold text-[#6e56f5] truncate ml-2">{v}</span></div>)}</div></div>}
        <div><div className="font-bold text-[13.5px] mb-2">Shared Space</div><button className="w-full nv-card p-3 flex items-center gap-3 hover:border-[#c9bffb]" onClick={() => nav(`/dashboard/spaces/${spaceId}`)} data-testid="info-shared-space"><SpaceIcon icon={space.icon} accent={space.accent} size={36} radius={10} /><div className="text-left flex-1"><div className="text-[13px] font-bold">{space.name}</div><div className="text-[11px] nv-muted capitalize">{space.type} Space</div></div><Icon name="chevron-right" size={14} className="nv-faint" /></button></div>
        <div><div className="flex items-center justify-between mb-2"><div className="font-bold text-[13.5px]">Shared Files ({files.length})</div><button className="nv-link" onClick={() => nav(`/dashboard/spaces/${spaceId}/files`)}>View all</button></div>
          {!files.length ? <div className="text-xs nv-muted">No files shared yet.</div> : <div className="space-y-2">{files.slice(0, 3).map((f, i) => <a key={i} href={`${process.env.REACT_APP_BACKEND_URL}${f.url}`} target="_blank" rel="noreferrer" className="flex items-center gap-3"><div className={`stat-icon tone-${FILE_TONE(f.name)}`} style={{ width: 36, height: 36 }}><Icon name="file-text" size={15} /></div><div className="min-w-0"><div className="text-[12.5px] font-bold truncate">{f.name}</div><div className="text-[11px] nv-muted">{(f.size / 1024 / 1024).toFixed(1)} MB</div></div></a>)}</div>}</div>
        <div><div className="font-bold text-[13.5px] mb-2">Recent Activity</div><div className="space-y-2.5">{recent.map((m) => <div key={m.id} className="flex items-start gap-2.5"><Avatar user={m.sender} size={28} /><div className="min-w-0"><div className="text-[12px] font-semibold">{m.sender?.name} {m.attachments?.length ? 'shared a file' : 'sent a message'}</div><div className="text-[11px] nv-muted truncate">"{m.content || m.attachments?.[0]?.name}" · {ago(m.created_at)}</div></div></div>)}{!recent.length && <div className="text-xs nv-muted">Nothing yet.</div>}</div></div>
        <div><div className="font-bold text-[13.5px] mb-2">Linked Meetings</div>{!upcoming.length ? <button className="text-xs nv-link" onClick={() => nav(`/dashboard/spaces/${spaceId}/meetings?new=1`)}>Schedule a meeting →</button> : upcoming.map((e) => <button key={e.id} className="w-full nv-card p-3 flex items-center gap-3 hover:border-[#c9bffb] mb-2" onClick={() => nav(`/dashboard/spaces/${spaceId}/meetings`)} data-testid="info-linked-meeting"><div className="stat-icon tone-violet" style={{ width: 36, height: 36 }}><Icon name="calendar" size={15} /></div><div className="text-left flex-1 min-w-0"><div className="text-[12.5px] font-bold truncate">{e.title}</div><div className="text-[11px] nv-muted">{dayjs(e.start_at).isSame(dayjs().add(1, 'day'), 'day') ? 'Tomorrow' : dayjs(e.start_at).format('MMM D')}, {fmtTime(e.start_at)} – {fmtTime(e.end_at)}</div></div><Icon name="chevron-right" size={14} className="nv-faint" /></button>)}</div>
      </div>
    </aside>
  );
}

function NewConversation({ spaceId, onDone, onCancel }) {
  const { data: people = [], isLoading } = useQuery({ queryKey: ['people', spaceId], queryFn: () => api.get('/people', { params: { space_id: spaceId } }).then((r) => r.data) });
  const [sel, setSel] = useState([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const presence = useApp((s) => s.presence);
  const create = async () => {
    setBusy(true);
    try { const { data } = await api.post('/conversations', sel.length === 1 ? { type: 'direct', member_ids: sel } : { type: 'group', member_ids: sel, space_id: spaceId, title: title || undefined, icon: 'users', accent: 'pink' }); onDone(data); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="flex-1 flex items-start justify-center pt-16 bg-white" data-testid="new-conversation">
      <div className="w-[460px] nv-card p-6 pop">
        <div className="nv-h2 text-[18px]">New conversation</div><div className="text-xs nv-muted mt-1">Pick one person for a direct message, or several for a group.</div>
        {sel.length > 1 && <input className="nv-input mt-4" placeholder="Group name" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="new-conv-title" />}
        <div className="mt-4 max-h-[300px] overflow-auto nv-scroll space-y-1">
          {isLoading && <Loading />}
          {!isLoading && !people.length && <Empty icon="users" title="No teammates yet" hint="Invite people to this Team Space first — messaging works between people who share a Space." />}
          {people.map((p) => <button key={p.id} onClick={() => setSel((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))} className={`w-full flex items-center gap-3 p-2 rounded-xl text-left ${sel.includes(p.id) ? 'bg-[#eeebfe]' : 'hover:bg-[#f7f6fd]'}`} data-testid={`person-${p.id}`}><Avatar user={p} size={34} online={presence.has(p.id)} /><div className="flex-1"><div className="text-[13px] font-bold">{p.name}</div><div className="text-[11px] nv-muted">{p.email}</div></div>{sel.includes(p.id) && <Icon name="check-circle-2" size={16} className="text-[#6e56f5]" />}</button>)}
        </div>
        <div className="flex justify-end gap-2 mt-5"><button className="nv-btn nv-btn-outline" onClick={onCancel} data-testid="new-conv-cancel">Cancel</button><button className="nv-btn nv-btn-primary" disabled={!sel.length || busy} onClick={create} data-testid="new-conv-create">{sel.length > 1 ? 'Create group' : 'Start chat'}</button></div>
      </div>
    </div>
  );
}
