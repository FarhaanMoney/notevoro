import { getUserById } from '../../../../lib/auth/userManager.js';
import { getTrialStatus } from '../../../../lib/subscription/trialManager.js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const trialStatus = getTrialStatus(userId);

    return NextResponse.json({
      userId: user.id,
      whatsappVerified: Boolean(user.whatsappVerified),
      trialStatus
    });
  } catch (error) {
    console.error('Onboarding status error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
