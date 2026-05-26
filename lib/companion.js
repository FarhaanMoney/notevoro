// Notevoro Companion System Utilities
// Shared utilities for study companion features

import { supabaseBrowser } from '@/lib/supabase/browser';

const supabase = supabaseBrowser();

// Study session types
export const SESSION_TYPES = {
  FOCUS: 'focus',
  BREAK: 'break',
  REVIEW: 'review'
};

// Reminder types
export const REMINDER_TYPES = {
  STUDY: 'study',
  REVISION: 'revision',
  ASSIGNMENT: 'assignment',
  EXAM: 'exam'
};

// Study session utilities
export const studySessionUtils = {
  // Create a new study session
  async createSession(userId, subject, duration, sessionType = SESSION_TYPES.FOCUS) {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          subject,
          duration,
          session_type: sessionType,
          completed: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating study session:', error);
      throw error;
    }
  },

  // Complete a study session
  async completeSession(sessionId, notes = null) {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error completing study session:', error);
      throw error;
    }
  },

  // Get user's recent study sessions
  async getRecentSessions(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching study sessions:', error);
      throw error;
    }
  },

  // Get today's study sessions
  async getTodaySessions(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching today sessions:', error);
      throw error;
    }
  }
};

// Daily check-in utilities
export const dailyCheckinUtils = {
  // Create or update daily check-in
  async saveCheckin(userId, studyingToday, mainGoalToday, readyForFocus) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_checkins')
        .upsert({
          user_id: userId,
          checkin_date: today,
          studying_today: studyingToday,
          main_goal_today: mainGoalToday,
          ready_for_focus: readyForFocus,
          completed: true,
          updated_at: new Date().toISOString()
        }, { onConflict: ['user_id', 'checkin_date'] })
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving daily check-in:', error);
      throw error;
    }
  },

  // Get today's check-in
  async getTodayCheckin(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error, status } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .eq('checkin_date', today)
        .maybeSingle();

      if (error && status !== 406) throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching today check-in:', error);
      return null;
    }
  },

  // Get recent check-ins
  async getRecentCheckins(userId, limit = 7) {
    try {
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('checkin_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent check-ins:', error);
      throw error;
    }
  }
};

// Reminder utilities
export const reminderUtils = {
  // Create a new reminder
  async createReminder(userId, title, description, reminderTime, reminderType) {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: userId,
          title,
          description,
          reminder_time: reminderTime,
          reminder_type: reminderType
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  },

  // Get upcoming reminders
  async getUpcomingReminders(userId) {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .gte('reminder_time', new Date().toISOString())
        .order('reminder_time', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching upcoming reminders:', error);
      throw error;
    }
  },

  // Mark reminder as complete
  async completeReminder(reminderId) {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error completing reminder:', error);
      throw error;
    }
  },

  // Delete reminder
  async deleteReminder(reminderId) {
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', reminderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  }
};

// Study profile utilities
export const studyProfileUtils = {
  // Get user study profile
  async getStudyProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('study_profile')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching study profile:', error);
      return null;
    }
  },

  // Update study profile
  async updateStudyProfile(userId, profileData) {
    try {
      const { data, error } = await supabase
        .from('study_profile')
        .upsert({
          user_id: userId,
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating study profile:', error);
      throw error;
    }
  }
};

// Streak utilities
export const streakUtils = {
  // Get user streak info
  async getStreakInfo(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('streak_count, last_active_date')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching streak info:', error);
      return { streak_count: 0, last_active_date: null };
    }
  },

  // Update user streak (called automatically when session is completed)
  async updateStreak(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('streak_count, last_active_date')
        .eq('id', userId)
        .single();

      if (error) throw error;

      const today = new Date().toISOString().split('T')[0];
      const lastActive = data?.last_active_date?.toISOString().split('T')[0];
      
      let newStreakCount = 1; // Reset to 1 for new streak
      if (lastActive === today) {
        // Already active today, keep current streak
        newStreakCount = data.streak_count || 1;
      } else if (lastActive === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
        // Active yesterday, increment streak
        newStreakCount = (data.streak_count || 0) + 1;
      }

      const { data: updatedData, error: updateError } = await supabase
        .from('users')
        .update({
          streak_count: newStreakCount,
          last_active_date: today
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;
      return updatedData;
    } catch (error) {
      console.error('Error updating streak:', error);
      throw error;
    }
  }
};

// AI context preparation utilities
export const aiContextUtils = {
  // Get user study context for AI
  async getUserStudyContext(userId) {
    try {
      const { data, error } = await supabase
        .rpc('get_user_study_context', { p_user_id: userId });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting user study context:', error);
      return {};
    }
  },

  // Format study context for AI prompts
  formatStudyContextForAI(context) {
    return {
      streak: context.streak_count || 0,
      lastActive: context.last_active_date,
      studyGoal: context.study_goal,
      preferredTime: context.preferred_study_time,
      subjects: context.subjects || [],
      weakSubjects: context.weak_subjects || [],
      examDates: context.exam_dates || {},
      recentSessions: context.recent_sessions || [],
      upcomingReminders: context.upcoming_reminders || [],
      todayCheckin: context.today_checkin || null
    };
  }
};

// Focus timer utilities
export const focusTimerUtils = {
  // Default timer settings
  DEFAULT_SETTINGS: {
    focusDuration: 45, // minutes
    breakDuration: 10, // minutes
    longBreakDuration: 15, // minutes
    sessionsUntilLongBreak: 4
  },

  // Format time display
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  // Calculate session end time
  getSessionEndTime(duration) {
    return new Date(Date.now() + duration * 60000).toISOString();
  }
};
