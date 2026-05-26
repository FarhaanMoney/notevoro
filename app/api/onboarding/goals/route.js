/**
 * Onboarding Goals API
 * Handles goal setup during onboarding
 */

import { completeGoalsStep } from '../../../../lib/onboarding/onboardingManager.js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, goals } = body;

    if (!userId || !goals) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, goals' },
        { status: 400 }
      );
    }

    const result = completeGoalsStep(userId, goals);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Onboarding goals error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
