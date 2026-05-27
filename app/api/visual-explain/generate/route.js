import { NextResponse } from 'next/server';
import { generateVisualFromAI } from '@/lib/ai/generateVisual';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const user = await requireUser(req);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { topic, subject, level } = body || {};
    if (!topic) return NextResponse.json({ success: false, error: 'Missing topic' }, { status: 400 });

    const visual = await generateVisualFromAI(topic, subject || 'general', level || 'intro');
    if (!visual) return NextResponse.json({ success: false, error: 'AI generation failed' }, { status: 502 });

    return NextResponse.json({ success: true, visual });
  } catch (err) {
    console.error('visual generate error', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
