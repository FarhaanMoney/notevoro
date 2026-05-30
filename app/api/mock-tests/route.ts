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
    const { topic, difficulty, sections, fileUrl } = await req.json();

    if (!topic && !fileUrl) {
      return NextResponse.json({ error: 'Topic or file is required' }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createServerSupabaseClient(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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
        .select('mock_tests_created')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (usage && usage.mock_tests_created >= 2) {
        return NextResponse.json(
          { error: 'You have reached your daily limit. Upgrade to Pro for unlimited mock tests.' },
          { status: 429 }
        );
      }
    }

    // Generate mock test using AI
    const sectionCount = sections || 3;
    let prompt = '';
    if (fileUrl) {
      prompt = `Generate a comprehensive mock test from the uploaded file at: ${fileUrl}
Topic: ${topic || 'File content'}
Difficulty: ${difficulty || 'medium'}
Number of sections: ${sectionCount}

For each section, generate:
- Section name
- 5 multiple choice questions with 4 options each
- Correct answer (index 0-3)
- Explanation for the correct answer

Return the response in JSON format with this structure:
{
  "sections": [
    {
      "name": "Section Name",
      "questions": [
        {
          "question": "question text",
          "options": ["option A", "option B", "option C", "option D"],
          "correct_answer": 0,
          "explanation": "explanation"
        }
      ]
    }
  ]
}`;
    } else {
      prompt = `Generate a comprehensive mock test about: ${topic}
Difficulty: ${difficulty || 'medium'}
Number of sections: ${sectionCount}

For each section, generate:
- Section name
- 5 multiple choice questions with 4 options each
- Correct answer (index 0-3)
- Explanation for the correct answer

Return the response in JSON format with this structure:
{
  "sections": [
    {
      "name": "Section Name",
      "questions": [
        {
          "question": "question text",
          "options": ["option A", "option B", "option C", "option D"],
          "correct_answer": 0,
          "explanation": "explanation"
        }
      ]
    }
  ]
}`;
    }

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator. Generate high-quality comprehensive mock tests. Always return valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Failed to generate mock test');
    }

    const testData = JSON.parse(content);

    // Save mock test to database
    const { data: mockTest, error: insertError } = await supabase
      .from('mock_tests')
      .insert({
        user_id: user.id,
        title: `${topic} Mock Test`,
        topic,
        difficulty: difficulty || 'medium',
        sections: testData.sections,
        file_url: fileUrl || null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error('Failed to save mock test');
    }

    // Update daily usage
    if (profile?.plan === 'free') {
      const today = new Date().toISOString().split('T')[0];
      const { data: existingUsage } = await supabase
        .from('daily_usage')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existingUsage) {
        await supabase
          .from('daily_usage')
          .update({ mock_tests_created: existingUsage.mock_tests_created + 1 })
          .eq('id', existingUsage.id);
      } else {
        await supabase
          .from('daily_usage')
          .insert({
            user_id: user.id,
            date: today,
            chats_created: 0,
            notes_created: 0,
            quizzes_created: 0,
            mock_tests_created: 1,
          });
      }
    }

    return NextResponse.json({ mockTest });
  } catch (error) {
    console.error('Mock test generation error:', error);
    return NextResponse.json({ error: 'Failed to generate mock test' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: mockTests, error } = await supabase
      .from('mock_tests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error('Failed to fetch mock tests');
    }

    return NextResponse.json({ mockTests: mockTests || [] });
  } catch (error) {
    console.error('Failed to fetch mock tests:', error);
    return NextResponse.json({ error: 'Failed to fetch mock tests' }, { status: 500 });
  }
}
