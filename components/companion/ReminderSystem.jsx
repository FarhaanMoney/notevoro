'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { reminderUtils, REMINDER_TYPES } from '@/lib/companion';
import { Bell, Plus, Check, Trash2, Calendar, BookOpen, FileText, Award } from 'lucide-react';

export default function ReminderSystem({ userId }) {
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminderTime: '',
    reminderType: REMINDER_TYPES.STUDY
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (userId) {
      loadReminders();
    }
  }, [userId]);

  const loadReminders = async () => {
    try {
      const upcomingReminders = await reminderUtils.getUpcomingReminders(userId);
      setReminders(upcomingReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.reminderTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      await reminderUtils.createReminder(
        userId,
        formData.title,
        formData.description,
        formData.reminderTime,
        formData.reminderType
      );
      
      toast.success('Reminder created successfully!');
      setShowCreateDialog(false);
      setFormData({
        title: '',
        description: '',
        reminderTime: '',
        reminderType: REMINDER_TYPES.STUDY
      });
      loadReminders();
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCompleteReminder = async (reminderId) => {
    try {
      await reminderUtils.completeReminder(reminderId);
      toast.success('Reminder marked as complete!');
      loadReminders();
    } catch (error) {
      console.error('Error completing reminder:', error);
      toast.error('Failed to complete reminder');
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    try {
      await reminderUtils.deleteReminder(reminderId);
      toast.success('Reminder deleted!');
      loadReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error('Failed to delete reminder');
    }
  };

  const getReminderIcon = (type) => {
    switch (type) {
      case REMINDER_TYPES.STUDY:
        return <BookOpen className="h-4 w-4" />;
      case REMINDER_TYPES.REVISION:
        return <FileText className="h-4 w-4" />;
      case REMINDER_TYPES.ASSIGNMENT:
        return <Calendar className="h-4 w-4" />;
      case REMINDER_TYPES.EXAM:
        return <Award className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getReminderColor = (type) => {
    switch (type) {
      case REMINDER_TYPES.STUDY:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case REMINDER_TYPES.REVISION:
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case REMINDER_TYPES.ASSIGNMENT:
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case REMINDER_TYPES.EXAM:
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
    }
  };

  const formatReminderTime = (timeString) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    return `In ${Math.floor(diffDays / 7)} weeks`;
  };

  const formatDateTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-zinc-800 rounded mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-zinc-800 rounded"></div>
            <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-purple-400" />
          <h3 className="text-white font-semibold">Study Reminders</h3>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {reminders.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">No upcoming reminders</p>
          <p className="text-zinc-500 text-xs mt-1">Create reminders to stay on track</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
            >
              <div className="flex-shrink-0">
                {getReminderIcon(reminder.reminder_type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white text-sm font-medium truncate">
                    {reminder.title}
                  </h4>
                  <Badge className={getReminderColor(reminder.reminder_type)}>
                    {reminder.reminder_type}
                  </Badge>
                </div>
                
                {reminder.description && (
                  <p className="text-zinc-400 text-xs mb-1 line-clamp-2">
                    {reminder.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>{formatReminderTime(reminder.reminder_time)}</span>
                  <span>•</span>
                  <span>{formatDateTime(reminder.reminder_time)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCompleteReminder(reminder.id)}
                  className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteReminder(reminder.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Reminder Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Bell className="h-5 w-5 text-purple-400" />
              Create Reminder
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateReminder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Title *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Study Mathematics, Complete Assignment"
                className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Type
              </label>
              <Select
                value={formData.reminderType}
                onValueChange={(value) => setFormData({ ...formData, reminderType: value })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value={REMINDER_TYPES.STUDY}>Study Session</SelectItem>
                  <SelectItem value={REMINDER_TYPES.REVISION}>Revision</SelectItem>
                  <SelectItem value={REMINDER_TYPES.ASSIGNMENT}>Assignment</SelectItem>
                  <SelectItem value={REMINDER_TYPES.EXAM}>Exam</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Date & Time *
              </label>
              <Input
                type="datetime-local"
                value={formData.reminderTime}
                onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                className="bg-zinc-900 border-zinc-700 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Description (optional)
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add any additional details..."
                className="bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isCreating ? 'Creating...' : 'Create Reminder'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
