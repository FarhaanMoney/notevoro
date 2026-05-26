/**
 * Onboarding Personalization API
 * Handles personalization setup during onboarding
 */

import { completePersonalizationStep } from '../../../../lib/onboarding/onboardingManager.js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, preferences } = body;

    if (!userId || !preferences) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, preferences' },
        { status: 400 }
      );
    }

    const result = completePersonalizationStep(userId, preferences);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Onboarding personalization error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
