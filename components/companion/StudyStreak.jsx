'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { streakUtils } from '@/lib/companion';
import { Flame, Trophy, Calendar } from 'lucide-react';

export default function StudyStreak({ userId }) {
  const [streakInfo, setStreakInfo] = useState({ streak_count: 0, last_active_date: null });
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (userId) {
      loadStreakInfo();
    }
  }, [userId]);

  const loadStreakInfo = async () => {
    try {
      const info = await streakUtils.getStreakInfo(userId);
      setStreakInfo(info);
    } catch (error) {
      console.error('Error loading streak info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAnimation = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const getStreakColor = (count) => {
    if (count === 0) return 'text-zinc-500';
    if (count >= 30) return 'text-yellow-400';
    if (count >= 14) return 'text-orange-400';
    if (count >= 7) return 'text-red-400';
    return 'text-orange-300';
  };

  const getStreakBadgeColor = (count) => {
    if (count === 0) return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
    if (count >= 30) return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    if (count >= 14) return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    if (count >= 7) return 'bg-red-500/20 text-red-300 border-red-500/30';
    return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  };

  const getStreakMessage = (count) => {
    if (count === 0) return 'Start your study journey';
    if (count >= 100) return 'Legendary dedication! 🔥';
    if (count >= 50) return 'Incredible consistency!';
    if (count >= 30) return 'Amazing momentum!';
    if (count >= 21) return 'Building great habits!';
    if (count >= 14) return 'Two weeks strong!';
    if (count >= 7) return 'One week streak!';
    if (count >= 3) return 'Great start!';
    return 'Keep it going!';
  };

  const getLastActiveText = (lastActiveDate) => {
    if (!lastActiveDate) return 'No activity yet';
    
    const today = new Date();
    const lastActive = new Date(lastActiveDate);
    const diffTime = Math.abs(today - lastActive);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Active today';
    if (diffDays === 1) return 'Active yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} weeks ago`;
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-800 rounded mb-3"></div>
          <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`relative ${isAnimating ? 'animate-bounce' : ''}`}>
            <Flame className={`h-6 w-6 ${getStreakColor(streakInfo.streak_count)} ${isAnimating ? 'animate-pulse' : ''}`} />
            {streakInfo.streak_count > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            )}
          </div>
          <h3 className="text-white font-semibold">Study Streak</h3>
        </div>
        <Badge className={getStreakBadgeColor(streakInfo.streak_count)}>
          {streakInfo.streak_count} {streakInfo.streak_count === 1 ? 'day' : 'days'}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="text-center py-4">
          <div className={`text-3xl font-bold ${getStreakColor(streakInfo.streak_count)} mb-2 ${isAnimating ? 'animate-pulse' : ''}`}>
            {streakInfo.streak_count}
            <span className="text-lg text-zinc-400 ml-1">days</span>
          </div>
          <p className="text-sm text-zinc-400">
            {getStreakMessage(streakInfo.streak_count)}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-zinc-400">
            <Calendar className="h-4 w-4" />
            <span>{getLastActiveText(streakInfo.last_active_date)}</span>
          </div>
          {streakInfo.streak_count >= 7 && (
            <div className="flex items-center gap-1 text-yellow-400">
              <Trophy className="h-4 w-4" />
              <span className="text-xs">Achievement</span>
            </div>
          )}
        </div>

        {/* Streak milestones indicator */}
        {streakInfo.streak_count > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
              <span>Progress</span>
              <span>{streakInfo.streak_count} / 30 days</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-orange-500 to-yellow-400 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min((streakInfo.streak_count / 30) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>Start</span>
              <span>30 Day Goal</span>
            </div>
          </div>
        )}

        {/* Motivational tips */}
        {streakInfo.streak_count === 0 && (
          <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-xs text-purple-300">
              💡 Complete a study session to start your streak!
            </p>
          </div>
        )}

        {streakInfo.streak_count >= 1 && streakInfo.streak_count < 3 && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-xs text-green-300">
              🌱 Great start! Keep the momentum going!
            </p>
          </div>
        )}

        {streakInfo.streak_count >= 3 && streakInfo.streak_count < 7 && (
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300">
              🚀 You're building consistency! Almost one week!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
