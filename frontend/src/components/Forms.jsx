import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Icon } from '../lib/icons';

export function useCrud(spaceId, resource, key = resource) {
  const qc = useQueryClient();
  const qk = [key, spaceId];
  const list = useQuery({ queryKey: qk, queryFn: () => api.get(`/spaces/${spaceId}/${resource}`).then((r) => r.data) });
  const inval = () => qc.invalidateQueries({ queryKey: qk });
  const create = useMutation({ mutationFn: (body) => api.post(`/spaces/${spaceId}/${resource}`, body).then((r) => r.data), onSuccess: () => { inval(); qc.invalidateQueries({ queryKey: ['home', spaceId] }); }, onError: (e) => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, ...body }) => api.patch(`/spaces/${spaceId}/${resource}/${id}`, body).then((r) => r.data), onSuccess: inval, onError: (e) => toast.error(e.message) });
  const remove = useMutation({ mutationFn: (id) => api.delete(`/spaces/${spaceId}/${resource}/${id}`), onSuccess: inval, onError: (e) => toast.error(e.message) });
  return { ...list, items: list.data || [], create, update, remove, inval };
}

export function Modal({ title, onClose, children, width = 480, testId = 'modal' }) {
  return (
    <div className="fixed inset-0 z-[70] bg-[#16141f]/25 backdrop-blur-[2px] grid place-items-center p-4" onMouseDown={onClose} data-testid={testId} role="dialog" aria-modal="true">
      <div className="nv-card p-6 pop shadow-2xl max-h-[90vh] overflow-auto nv-scroll" style={{ width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><div className="nv-h2 text-[17px]">{title}</div><button className="nv-btn nv-btn-ghost w-8 px-0" onClick={onClose} aria-label="Close" data-testid={`${testId}-close`}><Icon name="x" size={16} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return <label className="block"><div className="text-[11.5px] font-bold nv-muted mb-1">{label}</div>{children}</label>;
}

export function Select({ value, onChange, options, testId }) {
  return <select className="nv-input h-9" value={value ?? ''} onChange={(e) => onChange(e.target.value)} data-testid={testId}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
}

export function toLocalInput(iso) { if (!iso) return ''; const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
export function fromLocalInput(v) { return v ? new Date(v).toISOString() : null; }

export function ConfirmDelete({ onConfirm, label = 'Delete', testId = 'delete-button' }) {
  return <button className="nv-btn nv-btn-ghost nv-btn-sm text-[#ee5a5a] hover:bg-[#fde7e7]" onClick={() => window.confirm('Delete this item? This cannot be undone.') && onConfirm()} data-testid={testId}><Icon name="trash-2" size={13} /> {label}</button>;
}
