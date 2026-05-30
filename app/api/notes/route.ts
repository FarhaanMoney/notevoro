import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(req: NextRequest) {
  try {
    console.log('Notes POST route hit');
    const { topic, text, sourceType, fileUrl } = await req.json();

    if (!topic && !text && !fileUrl) {
      return NextResponse.json({ error: 'Topic, text, or file is required' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createServerSupabaseClient(req);
    console.log('Supabase client created');
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session:', session);
    console.log('Session error:', sessionError);
    console.log('User from session:', session?.user);
    
    if (sessionError || !session || !session.user) {
      console.log('Unauthorized - session missing or invalid');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;

    // Check daily limits for free users
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profile?.plan === 'free') {
      const today = new Date().toISOString().split('T')[0];
      const { data: usage } = await supabase
        .from('daily_usage')
        .select('notes_created')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (usage && usage.notes_created >= 5) {
        return NextResponse.json(
          { error: 'You have reached your daily limit. Upgrade to Pro for unlimited notes.' },
          { status: 429 }
        );
      }
    }

    // Generate notes using AI
    let prompt = '';
    if (fileUrl) {
      prompt = `Generate comprehensive study notes from the uploaded file at: ${fileUrl}\n\nTopic: ${topic || 'File content'}\n\nReturn the response in JSON format with: summary, key_concepts (array), important_points (array), definitions (array of objects with term and definition).`;
    } else if (text) {
      prompt = `Generate comprehensive study notes from the following text:\n\n${text}\n\nReturn the response in JSON format with: summary, key_concepts (array), important_points (array), definitions (array of objects with term and definition).`;
    } else {
      prompt = `Generate comprehensive study notes about: ${topic}\n\nReturn the response in JSON format with: summary, key_concepts (array), important_points (array), definitions (array of objects with term and definition).`;
    }

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator. Generate structured, comprehensive study notes. Always return valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Failed to generate notes');
    }

    const notesData = JSON.parse(content);
    const title = topic || 'Untitled Notes';

    // Save notes to database
    const { data: note, error: insertError } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title,
        content: text || topic,
        summary: notesData.summary || '',
        key_concepts: notesData.key_concepts || [],
        important_points: notesData.important_points || [],
        definitions: notesData.definitions || [],
        source_type: sourceType || 'topic',
        file_url: fileUrl || null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error('Failed to save notes');
    }

    // Update daily usage
    if (profile?.plan === 'free') {
      const today = new Date().toISOString().split('T')[0];
      const { data: existingUsage } = await supabase
        .from('daily_usage')
        .select('id, notes_created')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existingUsage) {
        await supabase
          .from('daily_usage')
          .update({ notes_created: existingUsage.notes_created + 1 })
          .eq('id', existingUsage.id);
      } else {
        await supabase
          .from('daily_usage')
          .insert({ user_id: user.id, date: today, notes_created: 1 });
      }
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Notes API error:', error);
    return NextResponse.json({ error: 'Failed to generate notes' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('Notes GET route hit');
    // Get authenticated user
    const supabase = await createServerSupabaseClient(req);
    console.log('Supabase client created');
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session:', session);
    console.log('Session error:', sessionError);
    console.log('User from session:', session?.user);
    
    if (sessionError || !session || !session.user) {
      console.log('Unauthorized - session missing or invalid');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = session.user;

    const { data: notes, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Notes fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
