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

    // Get workspace flashcards
    const { data: workspaceFlashcards, error: flashcardsError } = await sb
      .from('workspace_flashcards')
      .select('flashcard_id')
      .eq('workspace_id', params.id);

    if (flashcardsError) throw flashcardsError;

    if (!workspaceFlashcards || workspaceFlashcards.length === 0) {
      return NextResponse.json({ flashcards: [] });
    }

    // Get actual flashcards
    const flashcardIds = workspaceFlashcards.map(wf => wf.flashcard_id);
    const { data: flashcards, error: flashcardsFetchError } = await sb
      .from('flashcard_decks')
      .select('*')
      .in('id', flashcardIds)
      .order('created_at', { ascending: false });

    if (flashcardsFetchError) throw flashcardsFetchError;

    return NextResponse.json({ flashcards: flashcards || [] });
  } catch (error) {
    console.error('Failed to fetch workspace flashcards:', error);
    return NextResponse.json({ error: 'Failed to fetch workspace flashcards' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { flashcardId } = body;

    if (!flashcardId) {
      return NextResponse.json({ error: 'Flashcard ID is required' }, { status: 400 });
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

    // Verify flashcard belongs to user
    const { data: flashcard, error: flashcardError } = await sb
      .from('flashcard_decks')
      .select('*')
      .eq('id', flashcardId)
      .eq('user_id', user.id)
      .single();

    if (flashcardError || !flashcard) {
      return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });
    }

    // Link flashcard to workspace
    const { data: workspaceFlashcard, error: linkError } = await sb
      .from('workspace_flashcards')
      .insert({
        workspace_id: params.id,
        flashcard_id: flashcardId,
      })
      .select()
      .single();

    if (linkError) throw linkError;

    return NextResponse.json({ workspaceFlashcard });
  } catch (error) {
    console.error('Failed to link flashcard to workspace:', error);
    return NextResponse.json({ error: 'Failed to link flashcard to workspace' }, { status: 500 });
  }
}
