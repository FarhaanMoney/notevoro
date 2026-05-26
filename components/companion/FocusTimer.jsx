'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { studySessionUtils, focusTimerUtils } from '@/lib/companion';
import { Play, Pause, RotateCcw, Clock, Target, Brain } from 'lucide-react';

export default function FocusTimer({ userId, onSessionComplete }) {
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(focusTimerUtils.DEFAULT_SETTINGS.focusDuration * 60);
  const [sessionType, setSessionType] = useState('focus');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [sessionData, setSessionData] = useState({
    subject: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const settings = focusTimerUtils.DEFAULT_SETTINGS;

  const getSessionDuration = useCallback(() => {
    switch (sessionType) {
      case 'focus':
        return settings.focusDuration * 60;
      case 'break':
        return settings.breakDuration * 60;
      case 'longBreak':
        return settings.longBreakDuration * 60;
      default:
        return settings.focusDuration * 60;
    }
  }, [sessionType, settings]);

  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            setIsRunning(false);
            handleSessionComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleSessionComplete = async () => {
    // Play notification sound (you can add this later)
    try {
      new Audio('/notification.mp3').play().catch(() => {
        // Ignore audio errors
      });
    } catch (error) {
      // Ignore audio errors
    }

    if (sessionType === 'focus') {
      setShowSessionDialog(true);
      toast.success('Focus session completed! 🎯');
    } else {
      toast.success('Break completed! Ready to focus? 💪');
      // Automatically switch to focus session after break
      setSessionType('focus');
      setTimeLeft(getSessionDuration());
    }
  };

  const startSession = async () => {
    if (!sessionData.subject && sessionType === 'focus') {
      toast.error('Please enter what you\'re studying');
      return;
    }

    setIsLoading(true);
    try {
      const session = await studySessionUtils.createSession(
        userId,
        sessionData.subject || 'Break',
        Math.floor(timeLeft / 60),
        sessionType
      );
      setCurrentSessionId(session.id);
      setIsRunning(true);
      toast.success(`${sessionType === 'focus' ? 'Focus' : 'Break'} session started!`);
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    } finally {
      setIsLoading(false);
    }
  };

  const completeSession = async () => {
    if (!currentSessionId) return;

    setIsLoading(true);
    try {
      await studySessionUtils.completeSession(currentSessionId, sessionData.notes);
      
      if (sessionType === 'focus') {
        setSessionsCompleted(prev => prev + 1);
        const newSessionsCount = sessionsCompleted + 1;
        
        // Determine next session type
        if (newSessionsCount % settings.sessionsUntilLongBreak === 0) {
          setSessionType('longBreak');
          toast.success('Great work! Time for a long break 🌟');
        } else {
          setSessionType('break');
          toast.success('Great work! Time for a short break 💪');
        }
      }

      // Reset for next session
      setTimeLeft(getSessionDuration());
      setCurrentSessionId(null);
      setSessionData({ subject: '', notes: '' });
      setShowSessionDialog(false);

      if (onSessionComplete) {
        onSessionComplete();
      }
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Failed to complete session');
    } finally {
      setIsLoading(false);
    }
  };

  const pauseSession = () => {
    setIsRunning(false);
    toast.info('Session paused');
  };

  const resetSession = () => {
    setIsRunning(false);
    setTimeLeft(getSessionDuration());
    setCurrentSessionId(null);
    setSessionData({ subject: '', notes: '' });
    toast.info('Session reset');
  };

  const skipSession = () => {
    setIsRunning(false);
    if (sessionType === 'focus') {
      setSessionType('break');
    } else {
      setSessionType('focus');
    }
    setTimeLeft(getSessionDuration());
    setCurrentSessionId(null);
    toast.info('Session skipped');
  };

  const getSessionIcon = () => {
    switch (sessionType) {
      case 'focus':
        return <Brain className="h-4 w-4" />;
      case 'break':
        return <Clock className="h-4 w-4" />;
      case 'longBreak':
        return <Target className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getSessionColor = () => {
    switch (sessionType) {
      case 'focus':
        return 'bg-purple-600 hover:bg-purple-700';
      case 'break':
        return 'bg-green-600 hover:bg-green-700';
      case 'longBreak':
        return 'bg-blue-600 hover:bg-blue-700';
      default:
        return 'bg-purple-600 hover:bg-purple-700';
    }
  };

  const getSessionBadgeColor = () => {
    switch (sessionType) {
      case 'focus':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'break':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'longBreak':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {getSessionIcon()}
          <h3 className="text-white font-semibold">Focus Timer</h3>
        </div>
        <Badge className={getSessionBadgeColor()}>
          {sessionType === 'focus' ? 'Focus' : sessionType === 'break' ? 'Short Break' : 'Long Break'}
        </Badge>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className="text-5xl font-mono font-bold text-white mb-2">
          {focusTimerUtils.formatTime(timeLeft)}
        </div>
        <div className="text-sm text-zinc-400">
          {sessionType === 'focus' ? 'Focus Time' : sessionType === 'break' ? 'Short Break' : 'Long Break'}
        </div>
      </div>

      {/* Session Input (only for focus sessions) */}
      {sessionType === 'focus' && !isRunning && (
        <div className="mb-6">
          <Input
            value={sessionData.subject}
            onChange={(e) => setSessionData({ ...sessionData, subject: e.target.value })}
            placeholder="What are you studying?"
            className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500"
          />
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3 mb-6">
        {!isRunning ? (
          <Button
            onClick={startSession}
            disabled={isLoading || (sessionType === 'focus' && !sessionData.subject.trim())}
            className={`flex-1 ${getSessionColor()} text-white`}
          >
            <Play className="h-4 w-4 mr-2" />
            {isLoading ? 'Starting...' : 'Start'}
          </Button>
        ) : (
          <Button
            onClick={pauseSession}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
        )}
        
        <Button
          onClick={resetSession}
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>

        {isRunning && (
          <Button
            onClick={skipSession}
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Skip
          </Button>
        )}
      </div>

      {/* Session Progress */}
      {sessionsCompleted > 0 && (
        <div className="text-center text-sm text-zinc-400">
          Sessions completed today: <span className="text-purple-400 font-semibold">{sessionsCompleted}</span>
        </div>
      )}

      {/* Session Complete Dialog */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              Session Complete!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-purple-300 text-sm">
                Great job! You completed a {settings.focusDuration}-minute focus session.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Session Notes (optional)
              </label>
              <Input
                value={sessionData.notes}
                onChange={(e) => setSessionData({ ...sessionData, notes: e.target.value })}
                placeholder="What did you accomplish?"
                className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowSessionDialog(false)}
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Skip Notes
              </Button>
              <Button
                onClick={completeSession}
                disabled={isLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? 'Saving...' : 'Complete Session'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
