import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(req: NextRequest) {
  try {
    console.log('Flashcards POST route hit');
    const { topic, noteId, fileUrl } = await req.json();

    if (!topic && !noteId && !fileUrl) {
      return NextResponse.json({ error: 'Topic, note ID, or file is required' }, { status: 400 });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    console.log('Token extracted:', token ? 'yes' : 'no');
    
    if (!token) {
      console.log('No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const supabase = createClient(url, anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    
    console.log('Supabase client created');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('User:', user);
    console.log('Auth error:', authError);
    
    if (authError || !user) {
      console.log('Unauthorized - user missing or invalid');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get note content if noteId is provided
    let content = topic;
    if (noteId) {
      const { data: note } = await supabase
        .from('notes')
        .select('title, content, summary, key_concepts')
        .eq('id', noteId)
        .eq('user_id', user.id)
        .single();

      if (note) {
        content = `${note.title}\n\n${note.summary}\n\nKey concepts: ${note.key_concepts?.join(', ')}`;
      }
    }

    // Generate flashcards using AI
    let prompt = '';
    if (fileUrl) {
      prompt = `Generate 10 flashcards from the uploaded file at: ${fileUrl}\n\nTopic: ${topic || 'File content'}\n\nReturn the response in JSON format with this structure:
{
  "flashcards": [
    {
      "front": "question or term",
      "back": "answer or definition"
    }
  ]
}`;
    } else {
      prompt = `Generate 10 flashcards from the following content:\n\n${content}\n\nReturn the response in JSON format with this structure:
{
  "flashcards": [
    {
      "front": "question or term",
      "back": "answer or definition"
    }
  ]
}`;
    }

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator. Generate high-quality flashcards for active recall learning. Always return valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('Failed to generate flashcards');
    }

    const flashcardsData = JSON.parse(responseContent);

    // Save flashcards to database
    const savedFlashcards = [];
    for (const card of flashcardsData.flashcards) {
      const { data: flashcard, error: insertError } = await supabase
        .from('flashcards')
        .insert({
          user_id: user.id,
          front: card.front,
          back: card.back,
          mastery_level: 0,
          review_count: 0,
          file_url: fileUrl || null,
        })
        .select()
        .single();

      if (!insertError && flashcard) {
        savedFlashcards.push(flashcard);
      }
    }

    return NextResponse.json({ flashcards: savedFlashcards });
  } catch (error) {
    console.error('Flashcards API error:', error);
    return NextResponse.json({ error: 'Failed to generate flashcards' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('Flashcards GET route hit');
    // Extract token from Authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    console.log('Token extracted:', token ? 'yes' : 'no');
    
    if (!token) {
      console.log('No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const supabase = createClient(url, anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    
    console.log('Supabase client created');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('User:', user);
    console.log('Auth error:', authError);
    
    if (authError || !user) {
      console.log('Unauthorized - user missing or invalid');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: flashcards, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ flashcards });
  } catch (error) {
    console.error('Flashcards fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    console.log('Flashcards PATCH route hit');
    const { flashcardId, isCorrect } = await req.json();

    // Extract token from Authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    console.log('Token extracted:', token ? 'yes' : 'no');
    
    if (!token) {
      console.log('No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !anon) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const supabase = createClient(url, anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    
    console.log('Supabase client created');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log('User:', user);
    console.log('Auth error:', authError);
    
    if (authError || !user) {
      console.log('Unauthorized - user missing or invalid');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current flashcard
    const { data: flashcard } = await supabase
      .from('flashcards')
      .select('mastery_level, review_count')
      .eq('id', flashcardId)
      .eq('user_id', user.id)
      .single();

    if (!flashcard) {
      return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });
    }

    // Update mastery level
    const newMasteryLevel = isCorrect 
      ? Math.min(5, flashcard.mastery_level + 1)
      : Math.max(0, flashcard.mastery_level - 1);

    const { data: updatedFlashcard, error: updateError } = await supabase
      .from('flashcards')
      .update({
        mastery_level: newMasteryLevel,
        review_count: flashcard.review_count + 1,
        next_review_at: new Date(Date.now() + (newMasteryLevel + 1) * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', flashcardId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ flashcard: updatedFlashcard });
  } catch (error) {
    console.error('Flashcard update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
