import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = "force-dynamic";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    console.log('Note GET route hit for ID:', params.id);
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User:', user);
    console.log('Auth error:', authError);
    
    if (authError || !user) {
      console.log('Unauthorized - user missing or invalid');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: note, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Database fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Note fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    console.log('Note PATCH route hit for ID:', params.id);
    const { title, content } = await req.json();

    console.log('Note update payload:', { title, content });

    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User:', user);
    console.log('Auth error:', authError);
    
    if (authError || !user) {
      console.log('Unauthorized - user missing or invalid');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: note, error: updateError } = await supabase
      .from('notes')
      .update({
        title: title || undefined,
        content: content || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Note update error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    console.log('Note DELETE route hit for ID:', params.id);
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User:', user);
    console.log('Auth error:', authError);
    
    if (authError || !user) {
      console.log('Unauthorized - user missing or invalid');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Note delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
