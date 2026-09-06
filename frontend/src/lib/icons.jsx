import * as L from 'lucide-react';

const toPascal = (s) => s.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');

export function Icon({ name, size = 16, className, ...rest }) {
  const Cmp = L[toPascal(name || 'sparkles')] || L.Sparkles;
  return <Cmp size={size} className={className} strokeWidth={1.9} {...rest} />;
}

export const ACCENTS = ['violet', 'pink', 'blue', 'green', 'amber', 'red', 'teal', 'slate'];
export const SPACE_ICONS = ['sparkles', 'rocket', 'graduation-cap', 'lightbulb', 'book-open', 'heart', 'briefcase', 'flask-conical', 'palette', 'code', 'megaphone', 'compass', 'leaf', 'music', 'camera', 'globe'];

export function SpaceIcon({ icon, accent = 'violet', size = 36, radius = 10, iconSize }) {
  return (
    <div className={`bg-${accent} text-white grid place-items-center shrink-0`} style={{ width: size, height: size, borderRadius: radius }}>
      <Icon name={icon} size={iconSize || Math.round(size * 0.5)} />
    </div>
  );
}

export function Avatar({ user, size = 32, online, className = '' }) {
  const name = user?.name || '?';
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} data-testid="avatar">
      {user?.avatar_url ? (
        <img src={user.avatar_url} alt={name} className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-full h-full rounded-full grid place-items-center text-white font-bold" style={{ background: `hsl(${hue} 55% 60%)`, fontSize: size * 0.36 }}>{initials}</div>
      )}
      {online !== undefined && <span className={`absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white ${online ? 'bg-[#22b573]' : 'bg-[#c8c6d8]'}`} style={{ width: size * 0.32, height: size * 0.32 }} />}
    </div>
  );
}

export function AvatarStack({ users = [], size = 24, max = 3 }) {
  const shown = users.slice(0, max);
  return (
    <div className="flex items-center">
      {shown.map((u, i) => (
        <div key={u.id || i} style={{ marginLeft: i ? -size * 0.3 : 0 }} className="rounded-full ring-2 ring-white"><Avatar user={u} size={size} /></div>
      ))}
      {users.length > max && <span className="ml-1.5 text-[11px] font-semibold nv-muted">+{users.length - max}</span>}
    </div>
  );
}
