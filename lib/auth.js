import { supabaseAdmin } from '@/lib/supabase/admin';

function getBearerToken(req) {
  const auth = req.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function getUserFromRequest(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  const sb = supabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
