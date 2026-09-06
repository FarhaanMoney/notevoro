import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Icon } from './icons';

dayjs.extend(relativeTime);
export const ago = (d) => (d ? dayjs(d).fromNow() : '');
export const fmtTime = (d) => dayjs(d).format('h:mm A');
export const fmtDate = (d) => dayjs(d).format('MMM D');
export const dueLabel = (d) => {
  if (!d) return '';
  const x = dayjs(d);
  if (x.isSame(dayjs(), 'day')) return 'Today';
  if (x.isSame(dayjs().add(1, 'day'), 'day')) return 'Tomorrow';
  return x.format('MMM D');
};
export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export function Loading({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex items-center gap-2 nv-muted text-sm p-6 ${className}`} data-testid="state-loading">
      <Icon name="loader-2" className="spin" size={16} /> {label}
    </div>
  );
}

export function Empty({ icon = 'inbox', title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 gap-2" data-testid="state-empty">
      <div className="stat-icon tone-violet"><Icon name={icon} size={18} /></div>
      <div className="font-bold text-sm mt-1">{title}</div>
      {hint && <div className="text-xs nv-muted max-w-xs">{hint}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, compact }) {
  const code = error?.code;
  const title = code === 'OFFLINE' ? "You're offline" : code === 'FORBIDDEN' ? 'No access' : code === 'LIMIT_REACHED' ? 'Limit reached' : code === 'PLAN_REQUIRED' ? 'Upgrade required' : code === 'AI_NOT_CONFIGURED' ? 'Voro is not configured' : 'Something needs attention';
  return (
    <div className={`nv-card p-4 ${compact ? '' : 'm-4'} border-[#f5d9d9] bg-[#fff8f8]`} data-testid="state-error">
      <div className="flex items-start gap-3">
        <div className="stat-icon tone-red shrink-0" style={{ width: 32, height: 32 }}><Icon name="alert-circle" size={15} /></div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{title}</div>
          <div className="text-xs nv-muted mt-0.5">{error?.message || 'Unknown error'}</div>
          {error?.details?.limit !== undefined && (
            <div className="text-xs nv-muted mt-1">{error.details.current} / {error.details.limit} {error.details.unit} · resets {ago(error.details.resets_at)}</div>
          )}
          {error?.requestId && <div className="text-[10px] nv-faint mt-1">Request {error.requestId}</div>}
          <div className="flex gap-2 mt-3">
            {onRetry && <button className="nv-btn nv-btn-outline nv-btn-sm" onClick={onRetry} data-testid="retry-button"><Icon name="rotate-cw" size={13} /> Retry</button>}
            {(code === 'LIMIT_REACHED' || code === 'PLAN_REQUIRED') && <a href="/dashboard/settings?tab=billing" className="nv-btn nv-btn-primary nv-btn-sm" data-testid="upgrade-link">Upgrade plan</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Tag({ children, tone = 'violet' }) {
  return <span className={`nv-tag tone-${tone}`}>{children}</span>;
}

export const priorityTone = (p) => ({ high: 'red', medium: 'amber', low: 'green' }[p] || 'slate');
