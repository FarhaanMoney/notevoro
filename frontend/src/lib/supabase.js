/**
 * Supabase client for Notevoro collaboration realtime.
 *
 * When SUPABASE_URL / SUPABASE_ANON_KEY are BLANK (dev / offline) this
 * module exports `supabase = null` and `realtimeConfigured = false`.
 * Callers must guard with `realtimeConfigured` before opening a channel.
 * The Tiptap+Yjs editor still works in that mode (offline-local via
 * IndexedDB persistence) — collaboration simply doesn't sync until keys
 * are provided.
 *
 * We also fetch /api/v1/collab/config so the backend is the single source
 * of truth for whether realtime is enabled. Local .env is only a hint.
 */
import { createClient } from '@supabase/supabase-js';
import { api } from './api';

const localUrl = (process.env.REACT_APP_SUPABASE_URL || '').trim();
const localKey = (process.env.REACT_APP_SUPABASE_ANON_KEY || '').trim();

let _client = null;
let _config = { enabled: false, supabase_url: '', supabase_anon_key: '' };
let _initPromise = null;

function build(url, key) {
  if (!url || !key) return null;
  try {
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  } catch (e) {
    console.warn('[collab] failed to construct supabase client', e);
    return null;
  }
}

// Optimistic: build from .env immediately so pages that mount before
// the backend config resolves can still bind subscriptions.
if (localUrl && localKey) {
  _client = build(localUrl, localKey);
  _config = { enabled: true, supabase_url: localUrl, supabase_anon_key: localKey };
}

export async function initCollab() {
  if (_initPromise) return _initPromise;
  _initPromise = (async () => {
    try {
      const { data } = await api.get('/collab/config');
      if (data?.enabled && data.supabase_url && data.supabase_anon_key) {
        // Only rebuild if the backend config differs from local .env.
        if (data.supabase_url !== _config.supabase_url || data.supabase_anon_key !== _config.supabase_anon_key) {
          _client = build(data.supabase_url, data.supabase_anon_key);
        }
        _config = data;
      } else {
        _client = null;
        _config = { enabled: false, supabase_url: '', supabase_anon_key: '' };
      }
    } catch (e) {
      // Unauthed or backend unreachable — leave whatever we have.
    }
    return _config;
  })();
  return _initPromise;
}

export function getSupabase() {
  return _client;
}

export function isRealtimeConfigured() {
  return Boolean(_client && _config.enabled);
}

export const realtimeConfigured = () => isRealtimeConfigured();
