import { create } from 'zustand';
import { api } from './api';
import { getToken } from './auth';

export const useApp = create((set, get) => ({
  user: null,
  entitlements: null,
  authReady: false,
  online: navigator.onLine,
  presence: new Set(),
  typing: {},
  unread: 0,
  wsStatus: 'idle',
  voroOpen: true,
  setOnline: (online) => set({ online }),
  setVoroOpen: (voroOpen) => set({ voroOpen }),
  setWsStatus: (wsStatus) => set({ wsStatus }),
  setPresence: (ids) => set({ presence: new Set(ids) }),
  presenceChange: (id, online) => {
    const p = new Set(get().presence);
    online ? p.add(id) : p.delete(id);
    set({ presence: p });
  },
  setTyping: (convId, userId, name, typing) => {
    const t = { ...get().typing };
    const cur = { ...(t[convId] || {}) };
    if (typing) cur[userId] = name; else delete cur[userId];
    t[convId] = cur;
    set({ typing: t });
  },
  setUnread: (unread) => set({ unread }),
  loadMe: async () => {
    const token = await getToken();
    if (!token) return set({ authReady: true, user: null });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, entitlements: data.entitlements, authReady: true });
    } catch {
      set({ authReady: true, user: null });
    }
  },
  setEntitlements: (entitlements) => set({ entitlements }),
  setUser: (user) => set({ user }),
  reset: () => set({ user: null, entitlements: null }),
}));
