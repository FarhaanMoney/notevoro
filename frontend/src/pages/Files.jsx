import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, BASE } from '../lib/api';
import { Icon } from '../lib/icons';
import { ago, Empty, ErrorState, Loading } from '../lib/ui';
import { PageHeader, useSpace } from './SpaceShell';

const tone = (n = '') => (/\.(xlsx|csv)$/i.test(n) ? 'green' : /\.pdf$/i.test(n) ? 'red' : /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(n) ? 'pink' : /\.(mp3|wav|m4a)$/i.test(n) ? 'amber' : 'blue');
const icon = (n = '') => (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(n) ? 'image' : /\.(mp3|wav|m4a)$/i.test(n) ? 'music' : /\.(xlsx|csv)$/i.test(n) ? 'sheet' : 'file-text');
const size = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function Files() {
  const { spaceId, canWrite } = useSpace();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [uploading, setUploading] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const inp = useRef();
  const files = useQuery({ queryKey: ['files', spaceId], queryFn: () => api.get(`/spaces/${spaceId}/files`).then((r) => r.data) });
  useEffect(() => { if (params.get('upload')) { inp.current?.click(); setParams({}); } }, [params, setParams]);
  const upload = async (list) => {
    setError(null);
    for (const f of list) {
      setUploading(f.name);
      const fd = new FormData(); fd.append('file', f);
      try { await api.post(`/spaces/${spaceId}/files`, fd); } catch (e) { setError(e); toast.error(e.message); }
    }
    setUploading(null); qc.invalidateQueries({ queryKey: ['files', spaceId] }); qc.invalidateQueries({ queryKey: ['home', spaceId] });
  };
  const del = async (f) => { if (!window.confirm(`Delete ${f.name}?`)) return; await api.delete(`/spaces/${spaceId}/files/${f.id}`); qc.invalidateQueries({ queryKey: ['files', spaceId] }); };
  const items = (files.data || []).filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase()));
  const url = (f) => (f.url.startsWith('http') ? f.url : `${BASE}${f.url}`);
  return (
    <div className="fade-up" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); canWrite && upload([...e.dataTransfer.files]); }} data-testid="files-page">
      <PageHeader icon="folder" title="Files" subtitle="Metadata in Postgres, binaries in object storage (S3 when configured)." actions={<><input className="nv-input h-9 w-48" placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="files-search-input" /><input type="file" multiple className="hidden" ref={inp} onChange={(e) => upload([...e.target.files])} data-testid="files-input" />{canWrite && <button className="nv-btn nv-btn-primary" onClick={() => inp.current.click()} disabled={!!uploading} data-testid="files-upload-button">{uploading ? <><Icon name="loader-2" size={14} className="spin" /> Uploading {uploading}</> : <><Icon name="cloud-upload" size={14} /> Upload</>}</button>}</>} />
      <div className="px-7 pb-8">
        {error && <div className="mb-4"><ErrorState error={error} compact onRetry={() => setError(null)} /></div>}
        {files.isLoading && <Loading />}{files.error && <ErrorState error={files.error} onRetry={files.refetch} />}
        {!files.isLoading && !items.length && <Empty icon="cloud-upload" title="No files yet" hint="Drop files anywhere on this page to upload." action={canWrite && <button className="nv-btn nv-btn-primary nv-btn-sm" onClick={() => inp.current.click()} data-testid="files-empty-upload">Upload a file</button>} />}
        <div className="grid grid-cols-4 gap-4">{items.map((f) => (
          <div key={f.id} className="nv-card p-4 group relative hover:border-[#c9bffb] transition-colors" data-testid={`file-card-${f.id}`}>
            <button className="text-left w-full" onClick={() => setPreview(f)}><div className={`stat-icon tone-${tone(f.name)}`} style={{ width: 40, height: 40 }}><Icon name={icon(f.name)} size={17} /></div><div className="font-bold text-[13px] mt-3 truncate">{f.name}</div><div className="text-[11px] nv-muted mt-0.5">{size(f.size)} · {ago(f.created_at)}</div></button>
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><a href={url(f)} download={f.name} target="_blank" rel="noreferrer" className="nv-btn nv-btn-ghost w-7 h-7 px-0" aria-label="Download" data-testid="file-download"><Icon name="download" size={13} /></a>{canWrite && <button className="nv-btn nv-btn-ghost w-7 h-7 px-0 text-[#ee5a5a]" onClick={() => del(f)} aria-label="Delete" data-testid="file-delete"><Icon name="trash-2" size={13} /></button>}</div>
          </div>))}</div>
      </div>
      {preview && <div className="fixed inset-0 z-[70] bg-[#16141f]/60 grid place-items-center p-8" onClick={() => setPreview(null)} data-testid="file-preview"><div className="bg-white rounded-2xl p-4 max-w-[900px] max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between mb-3"><div className="font-bold text-sm">{preview.name}</div><a href={url(preview)} target="_blank" rel="noreferrer" className="nv-btn nv-btn-soft nv-btn-sm"><Icon name="external-link" size={13} /> Open</a></div>{/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(preview.name) ? <img src={url(preview)} alt={preview.name} className="max-h-[70vh] rounded-lg" /> : /\.pdf$/i.test(preview.name) ? <iframe title={preview.name} src={url(preview)} className="w-[800px] h-[70vh]" /> : /\.(mp3|wav|m4a)$/i.test(preview.name) ? <audio controls src={url(preview)} /> : <div className="text-xs nv-muted p-6">No inline preview for this type. Use Open to download.</div>}</div></div>}
    </div>
  );
}
