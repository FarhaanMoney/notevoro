'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CheckCircle, Clock, Plus, Sparkles, Target, TrendingUp, BookOpen, Play, Zap, Upload, FileText, Folder, Award, Flame, Trash2 } from 'lucide-react';
import AISidebar from '@/components/AISidebar';
import WorkspaceTopBar from '@/components/workspace/WorkspaceTopBar';
import FeatureDashboard from '@/components/workspace/FeatureDashboard';
import { createClient } from '@/lib/supabase/client';

export default function StudyPlanPage({ user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [hasStudyPlan, setHasStudyPlan] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      const response = await fetch('/api/workspaces', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data);
      }
    } catch (error) {
      console.error('Study plan page: Failed to load workspaces:', error);
    }
  };

  const sampleTasks = [
    { id: 1, title: 'Review Chapter 5: Neural Networks', subject: 'AI', time: '2h', completed: false, priority: 'high' },
    { id: 2, title: 'Practice flashcards for Biology', subject: 'Biology', time: '30m', completed: true, priority: 'medium' },
    { id: 3, title: 'Complete mock test for Math', subject: 'Math', time: '1h', completed: false, priority: 'high' },
    { id: 4, title: 'Read notes on History', subject: 'History', time: '45m', completed: false, priority: 'low' },
  ];

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    const task = {
      id: Date.now(),
      title: newTask,
      subject: 'General',
      time: '1h',
      completed: false,
      priority: 'medium'
    };
    setTasks([...tasks, task]);
    setNewTask('');
    setIsModalOpen(false);
  };

  const handleToggleTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  // Calculate statistics for dashboard
  const stats = {
    totalItems: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    inProgress: tasks.filter(t => !t.completed).length,
    streak: 5,
  };

  if (!hasStudyPlan) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <WorkspaceTopBar
          workspaceName={selectedWorkspace?.title}
          featureName="Study Plan"
          onSearch={(query) => setSearchQuery(query)}
          showExport={false}
          showFullscreen={false}
        />
        
        <FeatureDashboard
          featureType="study-plan"
          stats={stats}
        />

        {/* Enhanced Empty State */}
        <div className="flex-1 flex items-center justify-center px-6 bg-gray-50">
          <div className="text-center max-w-2xl">
            <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <Calendar className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Create Your Study Plan</h2>
            <p className="text-gray-500 mb-8">
              Organize your study schedule with AI-powered task management. 
              Set deadlines, track progress, and achieve your learning goals.
            </p>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <button
                onClick={() => setHasStudyPlan(true)}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <Zap className="h-6 w-6 text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Quick Start</h3>
                <p className="text-xs text-gray-500">Get started now</p>
              </button>
              <button
                onClick={() => setHasStudyPlan(true)}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <Target className="h-6 w-6 text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Set Goals</h3>
                <p className="text-xs text-gray-500">Define objectives</p>
              </button>
              <button
                onClick={() => setHasStudyPlan(true)}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <Calendar className="h-6 w-6 text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Schedule</h3>
                <p className="text-xs text-gray-500">Plan your time</p>
              </button>
              <button
                onClick={() => setIsAISidebarOpen(true)}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <Sparkles className="h-6 w-6 text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">AI Help</h3>
                <p className="text-xs text-gray-500">Get suggestions</p>
              </button>
            </div>

            <Button onClick={() => setHasStudyPlan(true)} size="lg" className="px-8">
              <Plus className="h-5 w-5 mr-2" />
              Create Study Plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <WorkspaceTopBar
        workspaceName={selectedWorkspace?.title}
        featureName="Study Plan"
        onSearch={(query) => setSearchQuery(query)}
        showExport={false}
        showFullscreen={false}
      />
      
      <FeatureDashboard
        featureType="study-plan"
        stats={stats}
      />

      {/* Quick Actions Bar */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsModalOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsAISidebarOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Assistant
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recent</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <Card key={task.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center shadow-md border border-gray-200 ${task.completed ? 'bg-green-100' : 'bg-white'}`}>
                      <CheckCircle className={`h-4 w-4 ${task.completed ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
                      <Play className="h-4 w-4 text-gray-500" />
                    </button>
                    <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{task.title}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Folder className="h-4 w-4" />
                    <span>{task.subject}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{task.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Award className="h-4 w-4" />
                    <span className="capitalize">{task.priority} priority</span>
                  </div>
                </div>
                <Button 
                  onClick={() => handleToggleTask(task.id)} 
                  variant={task.completed ? "outline" : "default"}
                  className="w-full" 
                  size="sm"
                >
                  {task.completed ? 'Completed' : 'Mark Complete'}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
      
      <AISidebar
        isOpen={isAISidebarOpen}
        onClose={() => setIsAISidebarOpen(false)}
        context={{
          tool: 'Study Plan',
          workspace: selectedWorkspace
        }}
      />
    </div>
  );
}
