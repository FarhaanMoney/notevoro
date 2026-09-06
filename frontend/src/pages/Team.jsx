import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { Avatar, Icon } from '../lib/icons';
import { ago, ErrorState, Loading, Tag } from '../lib/ui';
import { Field, Modal, Select } from '../components/Forms';
import { PageHeader, useSpace } from './SpaceShell';

const ROLE_TONE = { owner: 'violet', admin: 'pink', member: 'blue', viewer: 'slate' };

export default function Team() {
  const { spaceId, space, isAdmin, role } = useSpace();
  const me = useApp((s) => s.user);
  const presence = useApp((s) => s.presence);
  const qc = useQueryClient();
  const [invite, setInvite] = useState(false);
  const [emails, setEmails] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['members', spaceId], queryFn: () => api.get(`/spaces/${spaceId}/members`).then((r) => r.data) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['members', spaceId] }); qc.invalidateQueries({ queryKey: ['space', spaceId] }); };
  const send = useMutation({ mutationFn: () => api.post(`/spaces/${spaceId}/invitations`, { emails: emails.split(/[,\n\s]+/).filter((e) => e.includes('@')), role: inviteRole }).then((r) => r.data), onSuccess: (res) => { refresh(); setInvite(false); setEmails(''); toast.success(res.map((r) => `${r.email}: ${r.status.replace('_', ' ')}`).join(' · ')); }, onError: (e) => toast.error(e.message) });
  const setRole = useMutation({ mutationFn: ({ uid, role }) => api.patch(`/spaces/${spaceId}/members/${uid}`, { role }), onSuccess: refresh, onError: (e) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (uid) => api.delete(`/spaces/${spaceId}/members/${uid}`), onSuccess: refresh, onError: (e) => toast.error(e.message) });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  return (
    <div className="fade-up" data-testid="team-page">
      <PageHeader icon="users" title="Team" subtitle={`${data.members.length} members · ${data.members.filter((m) => presence.has(m.user.id)).length} online · you are ${role}`} actions={isAdmin && space.type === 'team' && <button className="nv-btn nv-btn-primary" onClick={() => setInvite(true)} data-testid="team-invite-button"><Icon name="user-plus" size={14} /> Invite</button>} />
      <div className="px-7 pb-8 space-y-6">
        {space.type === 'personal' && <div className="nv-card p-4 text-xs nv-muted">This is a Personal Space — just you. Create a Team Space to collaborate with others.</div>}
        <div className="nv-card divide-y divide-[var(--nv-border)]">{data.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3" data-testid={`member-${m.user.id}`}>
            <Avatar user={m.user} size={38} online={presence.has(m.user.id)} />
            <div className="flex-1 min-w-0"><div className="text-[13.5px] font-bold">{m.user.name} {m.user.id === me.id && <span className="nv-faint font-medium">(you)</span>}</div><div className="text-[11.5px] nv-muted">{m.user.email} · joined {ago(m.joined_at || m.created_at)}</div></div>
            {isAdmin && m.role !== 'owner' && m.user.id !== me.id ? <select className="nv-input h-8 w-28 text-xs" value={m.role} onChange={(e) => setRole.mutate({ uid: m.user.id, role: e.target.value })} data-testid="member-role-select"><option value="admin">Admin</option><option value="member">Member</option><option value="viewer">Viewer</option></select> : <Tag tone={ROLE_TONE[m.role]}>{m.role}</Tag>}
            {isAdmin && m.role !== 'owner' && m.user.id !== me.id && <button className="nv-btn nv-btn-ghost nv-btn-sm text-[#ee5a5a]" onClick={() => window.confirm(`Remove ${m.user.name}?`) && remove.mutate(m.user.id)} data-testid="member-remove"><Icon name="user-minus" size={13} /></button>}
          </div>))}</div>
        {data.invitations.length > 0 && <div><div className="nv-eyebrow mb-2">Pending invitations</div><div className="nv-card divide-y divide-[var(--nv-border)]">{data.invitations.map((i) => <div key={i.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]" data-testid="pending-invitation"><Icon name="mail" size={14} className="nv-faint" /><span className="flex-1">{i.email}</span><Tag tone="amber">{i.role} · pending</Tag><span className="text-[11px] nv-muted">{ago(i.created_at)}</span></div>)}</div><div className="text-[11px] nv-muted mt-2">People who already have a Notevoro account join instantly. Others join when they sign up with the invited email.</div></div>}
      </div>
      {invite && <Modal title="Invite to this Space" onClose={() => setInvite(false)} testId="invite-modal">
        <div className="space-y-3"><Field label="Emails"><textarea className="nv-input min-h-[90px]" placeholder={'sarah@company.com\nmichael@company.com'} value={emails} onChange={(e) => setEmails(e.target.value)} data-testid="invite-emails-input" /></Field><Field label="Role"><Select value={inviteRole} onChange={setInviteRole} options={[['member', 'Member — can edit'], ['admin', 'Admin — can manage members & capabilities'], ['viewer', 'Viewer — read only']]} testId="invite-role-select" /></Field>
          <div className="flex justify-end gap-2 pt-2"><button className="nv-btn nv-btn-outline" onClick={() => setInvite(false)}>Cancel</button><button className="nv-btn nv-btn-primary" disabled={!emails.includes('@') || send.isPending} onClick={() => send.mutate()} data-testid="invite-send">Send invitations</button></div></div>
      </Modal>}
    </div>
  );
}
