'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { dailyCheckinUtils } from '@/lib/companion';
import { Sparkles, Target, Clock, CheckCircle } from 'lucide-react';

export default function DailyCheckin({ userId, onCheckinComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [formData, setFormData] = useState({
    studyingToday: '',
    mainGoalToday: '',
    readyForFocus: false
  });

  useEffect(() => {
    if (userId) {
      loadTodayCheckin();
    }
  }, [userId]);

  const loadTodayCheckin = async () => {
    try {
      const checkin = await dailyCheckinUtils.getTodayCheckin(userId);
      setTodayCheckin(checkin);
      if (checkin) {
        setFormData({
          studyingToday: checkin.studying_today || '',
          mainGoalToday: checkin.main_goal_today || '',
          readyForFocus: checkin.ready_for_focus || false
        });
      }
    } catch (error) {
      console.error('Error loading today check-in:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.studyingToday.trim() || !formData.mainGoalToday.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await dailyCheckinUtils.saveCheckin(
        userId,
        formData.studyingToday,
        formData.mainGoalToday,
        formData.readyForFocus
      );
      
      toast.success('Daily check-in completed! 🎯');
      setIsOpen(false);
      setTodayCheckin({ ...formData, completed: true });
      
      if (onCheckinComplete) {
        onCheckinComplete();
      }
    } catch (error) {
      console.error('Error saving check-in:', error);
      toast.error('Failed to save check-in');
    } finally {
      setIsLoading(false);
    }
  };

  const shouldShowCheckin = () => {
    const today = new Date().toDateString();
    const lastCheckinDate = todayCheckin?.checkin_date ? new Date(todayCheckin.checkin_date).toDateString() : null;
    return !todayCheckin || lastCheckinDate !== today;
  };

  if (!shouldShowCheckin()) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <h3 className="text-white font-semibold">Today's Check-in</h3>
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
            Completed
          </Badge>
        </div>
        <div className="space-y-2 text-sm text-zinc-300">
          <p><span className="text-zinc-400">Studying:</span> {todayCheckin?.studying_today}</p>
          <p><span className="text-zinc-400">Goal:</span> {todayCheckin?.main_goal_today}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Sparkles className="h-5 w-5 text-purple-400" />
        <h3 className="text-white font-semibold">Daily Check-in</h3>
        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
          New
        </Badge>
      </div>
      
      <p className="text-zinc-300 text-sm mb-4">
        Start your study day with intention and focus.
      </p>

      <Button
        onClick={() => setIsOpen(true)}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
      >
        Start Check-in
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Daily Study Check-in
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                <Target className="h-4 w-4" />
                What are you studying today?
              </label>
              <Input
                value={formData.studyingToday}
                onChange={(e) => setFormData({ ...formData, studyingToday: e.target.value })}
                placeholder="e.g., Mathematics, Physics, Chemistry..."
                className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
                <Clock className="h-4 w-4" />
                What is your main goal today?
              </label>
              <Textarea
                value={formData.mainGoalToday}
                onChange={(e) => setFormData({ ...formData, mainGoalToday: e.target.value })}
                placeholder="e.g., Complete 3 chapters, Solve 20 problems, Review notes..."
                className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 resize-none"
                rows={3}
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="readyForFocus"
                checked={formData.readyForFocus}
                onChange={(e) => setFormData({ ...formData, readyForFocus: e.target.checked })}
                className="w-4 h-4 text-purple-600 bg-zinc-700 border-zinc-600 rounded focus:ring-purple-500"
              />
              <label htmlFor="readyForFocus" className="text-sm text-zinc-300">
                Ready to start a focus session
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Later
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? 'Saving...' : 'Complete Check-in'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
