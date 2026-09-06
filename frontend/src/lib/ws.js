/* Realtime delivery client. Durable truth is always the API; this only pushes updates and presence. */
import { BASE } from './api';
import { getToken } from './auth';
import { useApp } from './store';

const listeners = new Set();
let socket = null;
let retry = 0;
let closedByUser = false;
let pingTimer = null;

export function onEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function sendEvent(event, payload) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ event, payload }));
}

export async function connectRealtime() {
  closedByUser = false;
  const token = await getToken();
  if (!token || socket) return;
  const url = `${BASE.replace(/^http/, 'ws')}/api/v1/ws?token=${encodeURIComponent(token)}`;
  const store = useApp.getState();
  store.setWsStatus(retry ? 'reconnecting' : 'connecting');
  const ws = new WebSocket(url);
  socket = ws;
  ws.onopen = () => {
    retry = 0;
    useApp.getState().setWsStatus('connected');
    pingTimer = setInterval(() => sendEvent('ping', {}), 25000);
  };
  ws.onmessage = (m) => {
    let data;
    try { data = JSON.parse(m.data); } catch { return; }
    const { event, payload } = data;
    const s = useApp.getState();
    if (event === 'presence.snapshot') s.setPresence(payload.online);
    else if (event === 'presence.changed') s.presenceChange(payload.user_id, payload.online);
    else if (event === 'typing') s.setTyping(payload.conversation_id, payload.user_id, payload.name, payload.typing);
    listeners.forEach((fn) => fn(event, payload));
  };
  ws.onclose = () => {
    clearInterval(pingTimer);
    socket = null;
    if (closedByUser) return useApp.getState().setWsStatus('idle');
    useApp.getState().setWsStatus('reconnecting');
    const delay = Math.min(30000, 1000 * 2 ** retry) + Math.random() * 500;
    retry += 1;
    setTimeout(connectRealtime, delay);
  };
  ws.onerror = () => ws.close();
}

export function disconnectRealtime() {
  closedByUser = true;
  socket?.close();
  socket = null;
}
