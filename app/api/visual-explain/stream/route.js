'use strict';

import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { streamVisualFromAI } from '@/lib/ai/streamVisual.js';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const user = await requireUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { topic, subject, level } = body || {};
    if (!topic) {
      return NextResponse.json({ success: false, error: 'Missing topic' }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = streamVisualFromAI(topic, subject || 'general', level || 'intro');

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const packet of stream) {
            const line = `data: ${JSON.stringify(packet)}\n\n`;
            controller.enqueue(encoder.encode(line));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('Visual stream failed:', err);
          const errorPacket = { type: 'error', message: String(err) };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorPacket)}\n\n`));
          controller.close();
        }
      },
      cancel(reason) {
        console.warn('Visual stream cancelled:', reason);
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    console.error('visual stream route error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
