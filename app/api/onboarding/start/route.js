/**
 * Onboarding Start API
 * Starts the onboarding process for new users
 */

import { startOnboarding } from '../../../../lib/onboarding/onboardingManager.js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, phone } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email' },
        { status: 400 }
      );
    }

    const result = startOnboarding({ name, email, phone });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Onboarding start error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
