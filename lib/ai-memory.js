// Notevoro AI Memory Context System
// Backend utilities for AI memory integration

import { aiContextUtils } from './companion';
import { createClient } from '@supabase/supabase-js';

console.log('AI-MEMORY: SUPABASE URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('AI-MEMORY: SUPABASE KEY EXISTS', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    global: {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    }
  }
);

// AI memory context builder
export const aiMemoryBuilder = {
  // Get comprehensive user study context for AI
  async getUserStudyContext(userId) {
    try {
      const context = await aiContextUtils.getUserStudyContext(userId);
      return aiContextUtils.formatStudyContextForAI(context);
    } catch (error) {
      console.error('Error getting user study context:', error);
      return {};
    }
  },

  // Build AI prompt with user context
  buildPromptWithContext(basePrompt, userContext) {
    if (!userContext || Object.keys(userContext).length === 0) {
      return basePrompt;
    }

    const contextSections = [];

    // Add streak information
    if (userContext.streak > 0) {
      contextSections.push(`Study Streak: ${userContext.streak} days`);
    }

    // Add study goals
    if (userContext.studyGoal) {
      contextSections.push(`Study Goal: ${userContext.studyGoal}`);
    }

    // Add preferred study time
    if (userContext.preferredTime) {
      contextSections.push(`Preferred Study Time: ${userContext.preferredTime}`);
    }

    // Add subjects
    if (userContext.subjects && userContext.subjects.length > 0) {
      contextSections.push(`Subjects: ${userContext.subjects.join(', ')}`);
    }

    // Add weak subjects
    if (userContext.weakSubjects && userContext.weakSubjects.length > 0) {
      contextSections.push(`Areas to Improve: ${userContext.weakSubjects.join(', ')}`);
    }

    // Add recent study activity
    if (userContext.recentSessions && userContext.recentSessions.length > 0) {
      const recentActivity = userContext.recentSessions
        .slice(0, 3)
        .map(session => `${session.subject} (${session.duration}min)`)
        .join(', ');
      contextSections.push(`Recent Study: ${recentActivity}`);
    }

    // Add today's check-in
    if (userContext.todayCheckin) {
      const checkin = userContext.todayCheckin;
      if (checkin.studyingToday) {
        contextSections.push(`Today's Study: ${checkin.studyingToday}`);
      }
      if (checkin.mainGoalToday) {
        contextSections.push(`Today's Goal: ${checkin.mainGoalToday}`);
      }
    }

    // Add upcoming reminders
    if (userContext.upcomingReminders && userContext.upcomingReminders.length > 0) {
      const upcoming = userContext.upcomingReminders
        .slice(0, 2)
        .map(reminder => `${reminder.title} (${reminder.reminder_type})`)
        .join(', ');
      contextSections.push(`Upcoming: ${upcoming}`);
    }

    // Build final prompt
    if (contextSections.length > 0) {
      const contextString = contextSections.join('\n');
      return `User Context:\n${contextString}\n\n${basePrompt}`;
    }

    return basePrompt;
  },

  // Get study recommendations based on user context
  async getStudyRecommendations(userId) {
    try {
      const context = await this.getUserStudyContext(userId);
      const recommendations = [];

      // Streak-based recommendations
      if (context.streak === 0) {
        recommendations.push("Start with a short 25-minute focus session to build momentum");
      } else if (context.streak >= 7) {
        recommendations.push("Consider taking a longer break to prevent burnout");
      }

      // Weak subject recommendations
      if (context.weakSubjects && context.weakSubjects.length > 0) {
        recommendations.push(`Focus more time on: ${context.weakSubjects.join(', ')}`);
      }

      // Goal-based recommendations
      if (context.studyGoal) {
        recommendations.push(`Break down your goal: "${context.studyGoal}" into smaller tasks`);
      }

      // Activity-based recommendations
      if (context.recentSessions && context.recentSessions.length > 0) {
        const lastSession = context.recentSessions[0];
        if (lastSession.subject) {
          recommendations.push(`Continue studying ${lastSession.subject} or switch subjects for variety`);
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting study recommendations:', error);
      return [];
    }
  },

  // Analyze study patterns
  async analyzeStudyPatterns(userId, days = 7) {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sessions = data || [];
      const analysis = {
        totalSessions: sessions.length,
        totalMinutes: sessions.reduce((sum, session) => sum + (session.duration || 0), 0),
        averageSessionLength: 0,
        mostStudiedSubject: null,
        studyFrequency: {},
        completionRate: 0,
        bestStudyDay: null,
        studyPattern: 'irregular'
      };

      if (sessions.length > 0) {
        // Calculate average session length
        analysis.averageSessionLength = Math.round(analysis.totalMinutes / sessions.length);

        // Find most studied subject
        const subjectCounts = {};
        sessions.forEach(session => {
          if (session.subject) {
            subjectCounts[session.subject] = (subjectCounts[session.subject] || 0) + 1;
          }
        });
        
        const maxCount = Math.max(...Object.values(subjectCounts));
        analysis.mostStudiedSubject = Object.keys(subjectCounts).find(subject => subjectCounts[subject] === maxCount);

        // Study frequency by day
        const dayCounts = {};
        sessions.forEach(session => {
          const day = new Date(session.created_at).toLocaleDateString('en-US', { weekday: 'short' });
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        });
        analysis.studyFrequency = dayCounts;

        // Find best study day
        const maxDayCount = Math.max(...Object.values(dayCounts));
        analysis.bestStudyDay = Object.keys(dayCounts).find(day => dayCounts[day] === maxDayCount);

        // Calculate completion rate
        const completedSessions = sessions.filter(session => session.completed).length;
        analysis.completionRate = Math.round((completedSessions / sessions.length) * 100);

        // Determine study pattern
        if (analysis.completionRate >= 80) {
          analysis.studyPattern = 'consistent';
        } else if (analysis.completionRate >= 60) {
          analysis.studyPattern = 'improving';
        } else {
          analysis.studyPattern = 'irregular';
        }
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing study patterns:', error);
      return {
        totalSessions: 0,
        totalMinutes: 0,
        averageSessionLength: 0,
        mostStudiedSubject: null,
        studyFrequency: {},
        completionRate: 0,
        bestStudyDay: null,
        studyPattern: 'irregular'
      };
    }
  },

  // Get personalized study suggestions
  async getPersonalizedSuggestions(userId) {
    try {
      const [context, patterns] = await Promise.all([
        this.getUserStudyContext(userId),
        this.analyzeStudyPatterns(userId)
      ]);

      const suggestions = [];

      // Based on study patterns
      if (patterns.averageSessionLength < 30) {
        suggestions.push("Try increasing your focus sessions to 30-45 minutes for better retention");
      } else if (patterns.averageSessionLength > 60) {
        suggestions.push("Consider breaking long sessions into shorter chunks with breaks");
      }

      // Based on completion rate
      if (patterns.completionRate < 70) {
        suggestions.push("Set more realistic study goals to improve completion rate");
      }

      // Based on weak subjects
      if (context.weakSubjects && context.weakSubjects.length > 0) {
        suggestions.push(`Dedicate 20% more time to: ${context.weakSubjects.join(', ')}`);
      }

      // Based on study frequency
      const studyDays = Object.keys(patterns.studyFrequency);
      if (studyDays.length < 4) {
        suggestions.push("Try studying on more consistent days each week");
      }

      // Based on streak
      if (context.streak === 0) {
        suggestions.push("Start with just 15 minutes to build your study habit");
      } else if (context.streak >= 14) {
        suggestions.push("Great consistency! Consider setting more challenging goals");
      }

      return suggestions;
    } catch (error) {
      console.error('Error getting personalized suggestions:', error);
      return [];
    }
  },

  // Prepare AI response with context
  async prepareAIResponse(userId, userMessage) {
    try {
      const context = await this.getUserStudyContext(userId);
      const contextualPrompt = this.buildPromptWithContext(userMessage, context);
      
      return {
        prompt: contextualPrompt,
        context: context,
        suggestions: await this.getPersonalizedSuggestions(userId)
      };
    } catch (error) {
      console.error('Error preparing AI response:', error);
      return {
        prompt: userMessage,
        context: {},
        suggestions: []
      };
    }
  }
};

// Study analytics utilities
export const studyAnalytics = {
  // Get user's study statistics
  async getStudyStats(userId, period = 'week') {
    try {
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
      const patterns = await aiMemoryBuilder.analyzeStudyPatterns(userId, days);
      
      return {
        period,
        totalSessions: patterns.totalSessions,
        totalMinutes: patterns.totalMinutes,
        averageSessionLength: patterns.averageSessionLength,
        completionRate: patterns.completionRate,
        mostStudiedSubject: patterns.mostStudiedSubject,
        studyPattern: patterns.studyPattern,
        studyFrequency: patterns.studyFrequency
      };
    } catch (error) {
      console.error('Error getting study stats:', error);
      return null;
    }
  },

  // Get study streak analytics
  async getStreakAnalytics(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('streak_count, last_active_date')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const currentStreak = data.streak_count || 0;
      const lastActive = data.last_active_date;
      
      // Calculate streak history (simplified version)
      const streakHistory = await this.getStreakHistory(userId);
      
      return {
        currentStreak,
        lastActiveDate: lastActive,
        longestStreak: Math.max(...streakHistory, currentStreak),
        averageStreak: streakHistory.length > 0 ? Math.round(streakHistory.reduce((a, b) => a + b, 0) / streakHistory.length) : 0,
        streakHistory
      };
    } catch (error) {
      console.error('Error getting streak analytics:', error);
      return {
        currentStreak: 0,
        lastActiveDate: null,
        longestStreak: 0,
        averageStreak: 0,
        streakHistory: []
      };
    }
  },

  // Get simplified streak history
  async getStreakHistory(userId) {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Group by date and calculate streaks
      const dailyActivity = {};
      data.forEach(session => {
        const date = session.created_at.split('T')[0];
        dailyActivity[date] = true;
      });

      const dates = Object.keys(dailyActivity).sort();
      const streaks = [];
      let currentStreak = 0;

      for (let i = 0; i < dates.length; i++) {
        const currentDate = new Date(dates[i]);
        const prevDate = i > 0 ? new Date(dates[i - 1]) : null;
        
        if (!prevDate || (currentDate - prevDate) === 86400000) { // Same day or next day
          currentStreak++;
        } else {
          streaks.push(currentStreak);
          currentStreak = 1;
        }
      }
      
      if (currentStreak > 0) {
        streaks.push(currentStreak);
      }

      return streaks;
    } catch (error) {
      console.error('Error getting streak history:', error);
      return [];
    }
  }
};
