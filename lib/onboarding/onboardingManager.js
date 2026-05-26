/**
 * Onboarding Manager
 * Premium onboarding flow for new users
 */

import { supabaseAdmin } from '../supabase/admin.js';
import { createUser, updateUser, getUserByEmail, getUserById } from '../auth/userManager.js';
import { generateLinkingToken, generateWhatsAppLinkURL } from '../auth/whatsappLinking.js';
import { startProTrial } from '../subscription/trialManager.js';
import { startProTrialDb } from '../subscription/trialManagerDb.js';
import { getUserMemoryDB, updateUserMemoryDB } from '../database/memoryStore.js';
import { generateStudyPlan } from '../study/studyPlanner.js';

/**
 * Start onboarding for new user
 * @param {Object} userData - User data (name, email, phone)
 * @returns {Object} - Onboarding session
 */
export function startOnboarding(userData) {
  const { name, email, phone } = userData;
  let user = getUserByEmail(email);

  if (!user) {
    user = createUser({ name, email, phone });
  } else if (phone && !user.phoneNumber) {
    user = updateUser(user.id, { phoneNumber: phone });
  }

  user = updateUser(user.id, {
    onboardingStep: 'welcome',
    onboardingProgress: 0,
    onboardingStartedAt: new Date().toISOString(),
    onboardingCompletedAt: null
  });

  const onboardingSession = {
    userId: user.id,
    step: 'welcome',
    completedSteps: [],
    data: {},
    startedAt: new Date().toISOString(),
    trial: null
  };

  console.log('🚀 Onboarding started:', {
    userId: user.id,
    email: user.email,
    phone: user.phoneNumber,
    timestamp: new Date().toISOString()
  });

  return {
    user,
    session: onboardingSession
  };
}

/**
 * Complete welcome step
 * @param {string} userId - User ID
 * @returns {Object} - Next step info
 */
export function completeWelcomeStep(userId) {
  try {
    updateUser(userId, {
      onboardingStep: 'goals',
      onboardingProgress: 1
    });
  } catch (e) {
    console.warn('Welcome step update failed in legacy manager:', e.message);
  }

  return {
    nextStep: 'goals',
    message: 'Welcome to Notevoro! Let\'s set up your goals.'
  };
}

/**
 * Complete goals setup step
 * @param {string} userId - User ID
 * @param {Array} goals - User's goals
 * @returns {Object} - Next step info
 */
export function completeGoalsStep(userId, goals) {
  const memory = getUserMemoryDB(userId);
  updateUserMemoryDB(userId, {
    goals,
    ...memory
  });

  try {
    updateUser(userId, {
      onboardingStep: 'personalization',
      onboardingProgress: 2
    });
  } catch (e) {
    console.warn('Goals step update failed in legacy manager:', e.message);
  }

  return {
    nextStep: 'personalization',
    message: 'Goals saved! Now let\'s personalize your experience.'
  };
}

/**
 * Complete personalization step
 * @param {string} userId - User ID
 * @param {Object} preferences - User preferences
 * @returns {Object} - Next step info
 */
export function completePersonalizationStep(userId, preferences) {
  const memory = getUserMemoryDB(userId);
  updateUserMemoryDB(userId, {
    preferences: {
      ...memory.preferences,
      ...preferences
    }
  });

  try {
    updateUser(userId, {
      onboardingStep: 'whatsapp_connect',
      onboardingProgress: 3
    });
  } catch (e) {
    console.warn('Personalization step update failed in legacy manager:', e.message);
  }

  return {
    nextStep: 'whatsapp_connect',
    message: 'Preferences saved! Now let\'s connect your WhatsApp.'
  };
}

/**
 * Generate WhatsApp linking token for onboarding
 * @param {string} userId - User ID
 * @param {string} whatsappNumber - WhatsApp business number
 * @returns {Object} - Linking info
 */
export async function generateOnboardingLinkToken(userId, whatsappNumber) {
  // Ensure the legacy in-memory user exists before generating a link token
  if (!getUserById(userId)) {
    console.log(`Bootstrapping user ${userId} in legacy manager`);

    const sb = supabaseAdmin();
    const { data: userRecord, error: userRecordError } = await sb
      .from('users')
      .select('email, phone_number')
      .eq('id', userId)
      .single();

    if (userRecordError) {
      console.warn('Could not fetch user record for onboarding bootstrap:', userRecordError.message || userRecordError);
    }

    try {
      await createUser({
        id: userId,
        name: userRecord?.email || 'User',
        email: userRecord?.email || undefined,
        phone: userRecord?.phone_number || undefined
      });
    } catch (e) {
      console.error('Failed to bootstrap legacy user for WhatsApp linking:', e.message || e);
      throw new Error('Unable to initialize WhatsApp onboarding for this user');
    }
  }

  const tokenData = await generateLinkingToken(userId);
  const businessNumber = whatsappNumber || process.env.WHATSAPP_BUSINESS_NUMBER;

  if (!businessNumber) {
    throw new Error('WhatsApp business number is not configured');
  }

  const whatsappURL = generateWhatsAppLinkURL(tokenData.token, businessNumber);

  try {
    updateUser(userId, {
      onboardingStep: 'trial_activation',
      onboardingProgress: 4
    });
  } catch (err) {
    console.warn('Failed to update onboarding step in legacy manager:', err.message);
  }

  return {
    token: tokenData.token,
    whatsappURL,
    expiresAt: tokenData.expiresAt,
    message: 'Send the message to connect your WhatsApp!'
  };
}

/**
 * Activate Pro trial after WhatsApp connection
 * @param {string} userId - User ID
 * @returns {Object} - Trial info
 */
export function activateOnboardingTrial(userId) {
  // Prefer DB-backed trial activation for consistency across backend and webhooks
  return startProTrialDb(userId)
    .then(info => {
      try {
        updateUser(userId, {
          onboardingStep: 'first_experience',
          onboardingProgress: 5,
          onboardingCompletedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Legacy manager update failed during trial activation:', e.message);
      }
      return { trial: info, message: '7-day Pro trial activated! Welcome to Notevoro Pro!' };
    })
    .catch(err => {
      console.error('Failed to activate DB-backed trial:', err);
      // fallback to in-memory start if DB fails
      const trialInfo = startProTrial(userId);
      try {
        updateUser(userId, {
          onboardingStep: 'first_experience',
          onboardingProgress: 5,
          onboardingCompletedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Fallback trial activation update failed:', e.message);
      }
      return { trial: trialInfo, message: '7-day Pro trial activated (fallback)!' };
    });
}

/**
 * Generate first AI experience
 * @param {string} userId - User ID
 * @returns {Object} - First experience data
 */
export function generateFirstExperience(userId) {
  const memory = getUserMemoryDB(userId);
  try {
    updateUser(userId, {
      onboardingStep: 'completed',
      onboardingProgress: 6
    });
  } catch (e) {
    console.warn('Could not mark onboarding as completed in legacy manager:', e.message);
  }

  let experience = {};

  // Generate study plan if user has subjects
  if (memory.studySubjects && memory.studySubjects.length > 0) {
    const studyPlan = generateStudyPlan(userId);
    experience.studyPlan = studyPlan;
    experience.type = 'study_plan';
  } 
  // Generate productivity setup if user has goals
  else if (memory.goals && memory.goals.length > 0) {
    experience.productivitySetup = {
      goals: memory.goals,
      focusRecommendation: 'Start with 25-minute Pomodoro sessions',
      dailyCheckin: 'I\'ll send you morning goals and night reflections'
    };
    experience.type = 'productivity_setup';
  }
  // Default welcome experience
  else {
    experience.welcome = {
      message: 'Welcome to Notevoro! I\'m your AI productivity companion.',
      features: [
        'Set reminders with /remind',
        'Start focus sessions with /focus',
        'Track your streak with /streak',
        'Get help with /help'
      ]
    };
    experience.type = 'welcome';
  }

  console.log('✨ First experience generated:', {
    userId,
    type: experience.type,
    timestamp: new Date().toISOString()
  });

  return experience;
}

/**
 * Get onboarding progress
 * @param {string} userId - User ID
 * @returns {Object} - Onboarding progress
 */
export function getOnboardingProgress(userId) {
  let user;
  try {
    user = updateUser(userId, {}); // This just retrieves the user
  } catch (e) {
    console.warn('User not found in onboarding manager, using defaults');
    user = { onboardingStep: 'welcome', onboardingProgress: 0 };
  }
  
  const steps = [
    { id: 'welcome', name: 'Welcome', icon: '👋' },
    { id: 'goals', name: 'Goals', icon: '🎯' },
    { id: 'personalization', name: 'Personalization', icon: '⚙️' },
    { id: 'whatsapp_connect', name: 'WhatsApp Connect', icon: '📱' },
    { id: 'trial_activation', name: 'Trial Activation', icon: '🎁' },
    { id: 'first_experience', name: 'First Experience', icon: '✨' }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === user.onboardingStep);
  const completedSteps = steps.slice(0, currentStepIndex);

  return {
    currentStep: user.onboardingStep || 'welcome',
    progress: user.onboardingProgress || 0,
    totalSteps: steps.length,
    completedSteps: completedSteps.map(s => s.id),
    remainingSteps: steps.slice(currentStepIndex),
    isCompleted: user.onboardingStep === 'completed'
  };
}

/**
 * Skip onboarding (for users who want to explore first)
 * @param {string} userId - User ID
 * @returns {Object} - Result
 */
export function skipOnboarding(userId) {
  try {
    updateUser(userId, {
      onboardingStep: 'skipped',
      onboardingProgress: 0,
      onboardingSkippedAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn('Could not update skip status in legacy manager:', e.message);
  }

  return {
    message: 'Onboarding skipped. You can complete it later from settings.'
  };
}

/**
 * Resume onboarding
 * @param {string} userId - User ID
 * @returns {Object} - Current step info
 */
export function resumeOnboarding(userId) {
  let user;
  try {
    user = updateUser(userId, {}); // Retrieve user
  } catch (e) {
    console.warn('User not found in onboarding manager for resume');
    return { currentStep: 'welcome', progress: 0, message: 'Start onboarding from welcome step.' };
  }
  
  if (user.onboardingStep === 'completed' || user.onboardingStep === 'skipped') {
    return {
      message: 'Onboarding already completed or skipped.'
    };
  }

  return {
    currentStep: user.onboardingStep,
    progress: user.onboardingProgress,
    message: `Resume onboarding from ${user.onboardingStep} step.`
  };
}

/**
 * Get onboarding step content
 * @param {string} step - Step ID
 * @returns {Object} - Step content
 */
export function getStepContent(step) {
  const stepContents = {
    welcome: {
      title: 'Welcome to Notevoro',
      subtitle: 'Your AI productivity companion',
      description: 'Notevoro is your second brain for studying, productivity, and life organization.',
      features: [
        { icon: '🤖', title: 'AI Companion', description: 'Personalized AI that learns about you' },
        { icon: '📚', title: 'Study Planner', description: 'AI-generated study plans and schedules' },
        { icon: '🎯', title: 'Smart Reminders', description: 'Natural language reminder setting' },
        { icon: '🔥', title: 'Streak System', description: 'Build consistent study habits' },
        { icon: '⏱️', title: 'Focus Sessions', description: 'Pomodoro and deep work modes' },
        { icon: '📊', title: 'Analytics', description: 'Track your productivity and growth' }
      ]
    },
    goals: {
      title: 'Set Your Goals',
      subtitle: 'What do you want to achieve?',
      description: 'Tell me about your goals so I can personalize your experience.',
      prompts: [
        'What are your main study goals?',
        'What exams are you preparing for?',
        'What subjects do you struggle with?'
      ]
    },
    personalization: {
      title: 'Personalize Your Experience',
      subtitle: 'How do you like to work?',
      options: {
        productivityStyle: ['balanced', 'intense', 'relaxed'],
        studyIntensity: ['light', 'moderate', 'heavy'],
        reminderFrequency: ['daily', 'weekly', 'as_needed'],
        motivationalTone: ['supportive', 'energetic', 'gentle']
      }
    },
    whatsapp_connect: {
      title: 'Connect WhatsApp',
      subtitle: 'Link your WhatsApp for seamless AI interaction',
      description: 'Connect your WhatsApp to get reminders, check-ins, and AI coaching directly in your chat.',
      benefits: [
        'Instant AI responses',
        'Smart reminders',
        'Daily check-ins',
        'Focus session notifications'
      ]
    },
    trial_activation: {
      title: '7-Day Pro Trial',
      subtitle: 'Unlock premium features for free',
      description: 'Enjoy 7 days of Pro access with 250 AI Energy daily.',
      features: [
        '250 AI Energy/day',
        'Study planner',
        'Voice notes',
        'Advanced analytics',
        'Priority AI responses'
      ]
    },
    first_experience: {
      title: 'Your Personalized Experience',
      subtitle: 'Let me show you what I can do',
      description: 'Based on your goals and preferences, here\'s your personalized setup.'
    }
  };

  return stepContents[step] || null;
}
