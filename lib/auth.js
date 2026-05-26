import { supabaseAdmin } from '@/lib/supabase/admin';
import { ensureUserProfile } from '@/lib/auth/ensureUserProfile';

function getBearerToken(req) {
  const auth = req.headers.get('authorization') || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export async function getUserFromRequest(req) {
  const token = getBearerToken(req);

  if (!token) {
    return null;
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb.auth.getUser(token);

  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

export async function requireUser(req) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return null;
  }

  const sb = supabaseAdmin();
  let { data: userData, error } = await sb.from('users').select('*').eq('id', user.id).single();

  if (error || !userData) {
    console.warn('User row missing, creating default profile:', { userId: user.id, error });
    const ensured = await ensureUserProfile(user.id, user);
    if (!ensured) {
      return null;
    }

    const { data: createdProfile, error: createdError } = await sb
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (createdError || !createdProfile) {
      console.error('Failed to fetch created user profile:', createdError);
      return null;
    }

    userData = createdProfile;
  }

  return {
    ...user,
    ...userData,
  };
}

export { ensureUserProfile };
