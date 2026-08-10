/**
 * Profile recovery utilities.
 * Used when an auth user exists but public.profiles row is missing.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'

const VALID_WORKSPACES = new Set(['student', 'educator', 'professional'])

export function normalizeWorkspaceType(value?: string | null): 'student' | 'educator' | 'professional' {
  if (value && VALID_WORKSPACES.has(value)) {
    return value as 'student' | 'educator' | 'professional'
  }
  return 'student'
}

export function workspaceTypeFromUser(user: {
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}): 'student' | 'educator' | 'professional' {
  const meta = user.user_metadata?.workspace_type
  if (typeof meta === 'string') {
    return normalizeWorkspaceType(meta)
  }
  return 'student'
}

function profilePayload(
  userId: string,
  email: string | null | undefined,
  metadata: Record<string, unknown> = {}
) {
  const safeEmail = email || ''
  const workspaceType = normalizeWorkspaceType(
    typeof metadata.workspace_type === 'string' ? metadata.workspace_type : undefined
  )

  return {
    id: userId,
    email: safeEmail,
    full_name:
      (typeof metadata.full_name === 'string' && metadata.full_name) ||
      (typeof metadata.name === 'string' && metadata.name) ||
      null,
    display_name:
      (typeof metadata.display_name === 'string' && metadata.display_name) ||
      (typeof metadata.name === 'string' && metadata.name) ||
      safeEmail.split('@')[0] ||
      'User',
    avatar_url: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
    workspace_type: workspaceType,
    updated_at: new Date().toISOString(),
  }
}

/**
 * Recover a missing profile using the service role (bypasses RLS).
 * Returns the workspace_type if recovery succeeded, otherwise null.
 */
export async function recoverMissingProfile(
  userId: string,
  email: string | null | undefined,
  metadata: Record<string, unknown> = {}
): Promise<string | null> {
  const admin = supabaseAdmin
  if (!admin) {
    console.error('[profile-recovery] SUPABASE_SERVICE_ROLE_KEY not configured')
    return null
  }

  try {
    const { error: rpcError } = await admin.rpc('initialize_user_records', {
      p_user_id: userId,
      p_email: email || '',
      p_metadata: metadata,
    })

    if (!rpcError) {
      const { data: profile } = await admin
        .from('profiles')
        .select('workspace_type')
        .eq('id', userId)
        .maybeSingle()
      if (profile?.workspace_type) {
        console.log('[profile-recovery] Recovered via RPC:', userId, profile.workspace_type)
        return profile.workspace_type
      }
    } else {
      console.error('[profile-recovery] RPC failed, using direct upsert:', rpcError.message)
    }

    const payload = profilePayload(userId, email, metadata)
    const { error: upsertError } = await admin
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })

    if (upsertError) {
      console.error('[profile-recovery] Direct upsert failed:', upsertError.message)
      return null
    }

    console.log('[profile-recovery] Recovered via direct upsert:', userId, payload.workspace_type)
    return payload.workspace_type
  } catch (error) {
    console.error('[profile-recovery] Unexpected error:', error)
    return null
  }
}

export type WorkspaceLookupResult = {
  workspaceType: string | null
  recovered: boolean
}

/**
 * Resolve workspace type for routing. Attempts recovery when profile is missing.
 * Returns null workspaceType when unknown — callers must NOT treat null as student.
 */
export async function resolveWorkspaceType(
  supabase: { from: (table: string) => any },
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
): Promise<WorkspaceLookupResult> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('workspace_type')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[profile-recovery] Profile query error:', profileError.message)
  }

  if (profile?.workspace_type) {
    return { workspaceType: profile.workspace_type, recovered: false }
  }

  console.warn('[profile-recovery] Profile missing for user:', user.id, '- attempting recovery')
  const recoveredType = await recoverMissingProfile(
    user.id,
    user.email,
    user.user_metadata || {}
  )

  if (recoveredType) {
    return { workspaceType: recoveredType, recovered: true }
  }

  // Last-resort hint from auth metadata — only used when DB recovery failed entirely
  const metadataHint = workspaceTypeFromUser(user)
  if (user.user_metadata?.workspace_type) {
    console.warn(
      '[profile-recovery] Using auth metadata hint:',
      user.id,
      metadataHint
    )
    return { workspaceType: metadataHint, recovered: false }
  }

  return { workspaceType: null, recovered: false }
}
