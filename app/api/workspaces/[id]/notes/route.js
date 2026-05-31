import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sb = supabaseAdmin();
    
    // First verify workspace belongs to user
    const { data: workspace, error: workspaceError } = await sb
      .from('workspaces')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get workspace notes
    const { data: workspaceNotes, error: notesError } = await sb
      .from('workspace_notes')
      .select('note_id')
      .eq('workspace_id', params.id);

    if (notesError) throw notesError;

    if (!workspaceNotes || workspaceNotes.length === 0) {
      return NextResponse.json({ notes: [] });
    }

    // Get actual notes
    const noteIds = workspaceNotes.map(wn => wn.note_id);
    const { data: notes, error: notesFetchError } = await sb
      .from('notes')
      .select('*')
      .in('id', noteIds)
      .order('created_at', { ascending: false });

    if (notesFetchError) throw notesFetchError;

    return NextResponse.json({ notes: notes || [] });
  } catch (error) {
    console.error('Failed to fetch workspace notes:', error);
    return NextResponse.json({ error: 'Failed to fetch workspace notes' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { noteId } = body;

    if (!noteId) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const sb = supabaseAdmin();
    
    // Verify workspace belongs to user
    const { data: workspace, error: workspaceError } = await sb
      .from('workspaces')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (workspaceError || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Verify note belongs to user
    const { data: note, error: noteError } = await sb
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Link note to workspace
    const { data: workspaceNote, error: linkError } = await sb
      .from('workspace_notes')
      .insert({
        workspace_id: params.id,
        note_id: noteId,
      })
      .select()
      .single();

    if (linkError) throw linkError;

    return NextResponse.json({ workspaceNote });
  } catch (error) {
    console.error('Failed to link note to workspace:', error);
    return NextResponse.json({ error: 'Failed to link note to workspace' }, { status: 500 });
  }
}
