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
    console.log('Quizzes POST route hit');
    const { topic, difficulty, questionCount, fileUrl } = await req.json();

    if (!topic && !fileUrl) {
      return NextResponse.json({ error: 'Topic or file is required' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createServerSupabaseClient(req);
    console.log('Supabase client created');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User:', user);
    console.log('Auth error:', authError);
    
    if (authError || !user) {
      console.log('Unauthorized - user missing or invalid');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        .select('quizzes_generated')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (usage && usage.quizzes_generated >= 3) {
        return NextResponse.json(
          { error: 'You have reached your daily limit. Upgrade to Pro for unlimited quizzes.' },
          { status: 429 }
        );
      }
    }

    // Generate quiz using AI
    const count = questionCount || 5;
    const diff = difficulty || 'medium';

    let prompt = '';
    if (fileUrl) {
      prompt = `Generate ${count} multiple choice questions from the uploaded file at: ${fileUrl}
Topic: ${topic || 'File content'}
Difficulty: ${diff}

Return the response in JSON format with this structure:
{
  "questions": [
    {
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": 0,
      "explanation": "explanation of why this is correct"
    }
  ]
}

The correct_answer should be the index (0-3) of the correct option.`;
    } else {
      prompt = `Generate ${count} multiple choice questions about: ${topic}
Difficulty: ${diff}

Return the response in JSON format with this structure:
{
  "questions": [
    {
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_answer": 0,
      "explanation": "explanation of why this is correct"
    }
  ]
}

The correct_answer should be the index (0-3) of the correct option.`;
    }

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator. Generate high-quality multiple choice questions. Always return valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Failed to generate quiz');
    }

    const quizData = JSON.parse(content);

    // Save quiz to database
    const { data: quiz, error: insertError } = await supabase
      .from('quizzes')
      .insert({
        user_id: user.id,
        title: `${topic} Quiz`,
        topic,
        difficulty: diff,
        questions: quizData.questions,
        file_url: fileUrl || null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error('Failed to save quiz');
    }

    // Update daily usage
    if (profile?.plan === 'free') {
      const today = new Date().toISOString().split('T')[0];
      const { data: existingUsage } = await supabase
        .from('daily_usage')
        .select('id, quizzes_generated')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existingUsage) {
        await supabase
          .from('daily_usage')
          .update({ quizzes_generated: existingUsage.quizzes_generated + 1 })
          .eq('id', existingUsage.id);
      } else {
        await supabase
          .from('daily_usage')
          .insert({ user_id: user.id, date: today, quizzes_generated: 1 });
      }
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error('Quizzes API error:', error);
    return NextResponse.json({ error: 'Failed to generate quiz' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('Quizzes GET route hit');
    // Get authenticated user
    const supabase = await createServerSupabaseClient(req);
    console.log('Supabase client created');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('User:', user);
    console.log('Auth error:', authError);
    
    if (authError || !user) {
      console.log('Unauthorized - user missing or invalid');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error('Quizzes fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
