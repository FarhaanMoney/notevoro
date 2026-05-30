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
    console.log('Chat POST route hit');
    const { message, conversationId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
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
      const { data: usage } = await supabase
        .from('daily_usage')
        .select('chats_sent')
        .eq('user_id', user.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .single();

      if (usage && usage.chats_sent >= 10) {
        return NextResponse.json(
          { error: 'You have reached your daily limit. Upgrade to Pro for unlimited chats.' },
          { status: 429 }
        );
      }
    }

    // Generate conversation ID if not provided
    const convId = conversationId || crypto.randomUUID();

    // Save user message to chat history
    await supabase.from('chat_history').insert({
      user_id: user.id,
      conversation_id: convId,
      role: 'user',
      content: message,
    });

    // Update daily usage
    if (profile?.plan === 'free') {
      const today = new Date().toISOString().split('T')[0];
      const { data: existingUsage } = await supabase
        .from('daily_usage')
        .select('id, chats_sent')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (existingUsage) {
        await supabase
          .from('daily_usage')
          .update({ chats_sent: existingUsage.chats_sent + 1 })
          .eq('id', existingUsage.id);
      } else {
        await supabase
          .from('daily_usage')
          .insert({ user_id: user.id, date: today, chats_sent: 1 });
      }
    }

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful AI tutor for students. Provide clear, educational responses. Be encouraging and thorough.',
              },
              { role: 'user', content: message },
            ],
            stream: true,
          });

          let fullResponse = '';

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(content));
            }
          }

          // Save AI response to chat history
          await supabase.from('chat_history').insert({
            user_id: user.id,
            conversation_id: convId,
            role: 'assistant',
            content: fullResponse,
          });

          controller.close();
        } catch (error) {
          console.error('OpenAI streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
        'X-Conversation-ID': convId,
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('Chat GET route hit');
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

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

    let query = supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    const { data: messages, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Chat history fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
