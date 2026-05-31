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

    // Get workspace files
    const { data: files, error } = await sb
      .from('workspace_files')
      .select('*')
      .eq('workspace_id', params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ files: files || [] });
  } catch (error) {
    console.error('Failed to fetch workspace files:', error);
    return NextResponse.json({ error: 'Failed to fetch workspace files' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { filename, fileType, fileSize, storagePath } = body;

    if (!filename || !fileType) {
      return NextResponse.json({ error: 'Filename and file type are required' }, { status: 400 });
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

    // Create file record
    const { data: file, error: fileError } = await sb
      .from('workspace_files')
      .insert({
        workspace_id: params.id,
        user_id: user.id,
        filename,
        file_type: fileType,
        file_size: fileSize || null,
        storage_path: storagePath || null,
      })
      .select()
      .single();

    if (fileError) throw fileError;

    return NextResponse.json({ file });
  } catch (error) {
    console.error('Failed to create workspace file:', error);
    return NextResponse.json({ error: 'Failed to create workspace file' }, { status: 500 });
  }
}
