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

    // Get workspace quizzes
    const { data: workspaceQuizzes, error: quizzesError } = await sb
      .from('workspace_quizzes')
      .select('quiz_id')
      .eq('workspace_id', params.id);

    if (quizzesError) throw quizzesError;

    if (!workspaceQuizzes || workspaceQuizzes.length === 0) {
      return NextResponse.json({ quizzes: [] });
    }

    // Get actual quizzes
    const quizIds = workspaceQuizzes.map(wq => wq.quiz_id);
    const { data: quizzes, error: quizzesFetchError } = await sb
      .from('quizzes')
      .select('*')
      .in('id', quizIds)
      .order('created_at', { ascending: false });

    if (quizzesFetchError) throw quizzesFetchError;

    return NextResponse.json({ quizzes: quizzes || [] });
  } catch (error) {
    console.error('Failed to fetch workspace quizzes:', error);
    return NextResponse.json({ error: 'Failed to fetch workspace quizzes' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { quizId } = body;

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 });
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

    // Verify quiz belongs to user
    const { data: quiz, error: quizError } = await sb
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('user_id', user.id)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    // Link quiz to workspace
    const { data: workspaceQuiz, error: linkError } = await sb
      .from('workspace_quizzes')
      .insert({
        workspace_id: params.id,
        quiz_id: quizId,
      })
      .select()
      .single();

    if (linkError) throw linkError;

    return NextResponse.json({ workspaceQuiz });
  } catch (error) {
    console.error('Failed to link quiz to workspace:', error);
    return NextResponse.json({ error: 'Failed to link quiz to workspace' }, { status: 500 });
  }
}
