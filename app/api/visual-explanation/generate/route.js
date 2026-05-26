import { NextResponse } from 'next/server';
import { generateVisualExplanation } from '@/lib/visualExplanation/service';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const payload = await req.json().catch(() => ({}));
    const result = await generateVisualExplanation(payload, req);

    if (!result.success) {
      const status = result.code === 'UNAUTHORIZED' ? 401
        : result.code === 'INVALID_PAYLOAD' ? 400
        : result.code === 'UPGRADE_REQUIRED' ? 403
        : result.code === 'USER_NOT_FOUND' ? 404
        : result.code === 'INSUFFICIENT_ENERGY' ? 402
        : result.code === 'ENERGY_ERROR' ? 402
        : 500;

      return NextResponse.json({
        success: false,
        error: result.error,
        code: result.code,
        remainingEnergy: result.remainingEnergy ?? null,
      }, { status });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      remainingEnergy: result.remainingEnergy ?? null,
    });
  } catch (error) {
    console.error('Visual explanation API error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
