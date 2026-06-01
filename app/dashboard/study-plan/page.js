'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CheckCircle, Clock, Plus, Sparkles, Target, TrendingUp, BookOpen, Play } from 'lucide-react';
import AISidebar from '@/components/AISidebar';

export default function StudyPlanPage({ user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [hasStudyPlan, setHasStudyPlan] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState('');

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

  if (!hasStudyPlan) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        {/* Compact Header */}
        <div className="border-b border-gray-200 px-6 py-4 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Study Plan</h1>
              <p className="text-sm text-gray-500 mt-1">Organize your study schedule and track progress.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAISidebarOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
              <Button onClick={() => setHasStudyPlan(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b border-gray-200 px-6 py-3 bg-white">
          <div className="flex items-center gap-4">
            <div className="flex-1" />
            <Input
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
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

        {/* Compact Empty State */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No study plan yet</h3>
            <p className="text-sm text-gray-500 mb-4">Create your personalized study schedule.</p>
            <Button onClick={() => setHasStudyPlan(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      {/* Compact Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Study Plan</h1>
            <p className="text-sm text-gray-500 mt-1">Organize your study schedule and track progress.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAISidebarOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Assistant
            </Button>
            <Button onClick={() => setIsModalOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-gray-200 px-6 py-3 bg-white">
        <div className="flex items-center gap-4">
          <div className="flex-1" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {/* Performance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{tasks.filter(t => t.completed).length}/{tasks.length}</p>
                  <p className="text-sm text-gray-500">Tasks Done</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">75%</p>
                  <p className="text-sm text-gray-500">Completion</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}>
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">4h</p>
                  <p className="text-sm text-gray-500">Study Time</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}}>
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">7</p>
                  <p className="text-sm text-gray-500">Day Streak</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Today's Tasks Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Tasks</h2>
            <div className="space-y-3">
              {sampleTasks.map((task) => (
                <Card key={task.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          task.completed
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {task.completed && <CheckCircle className="h-4 w-4 text-white" />}
                      </button>
                      <div>
                        <h3 className={`font-semibold text-gray-900 ${task.completed ? 'line-through text-gray-400' : ''}`}>
                          {task.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">{task.subject}</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.time}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            task.priority === 'high' ? 'bg-red-100 text-red-700' :
                            task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Upcoming Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming This Week</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Math Quiz</h3>
                    <p className="text-xs text-gray-500">Tomorrow, 2:00 PM</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Prepare
                </Button>
              </Card>
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Biology Test</h3>
                    <p className="text-xs text-gray-500">Wednesday, 10:00 AM</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Prepare
                </Button>
              </Card>
              <Card className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}>
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">History Essay</h3>
                    <p className="text-xs text-gray-500">Friday, 5:00 PM</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Prepare
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Task</h3>
            <Input
              placeholder="Task title..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button onClick={handleAddTask} className="flex-1">
                Add Task
              </Button>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      <AISidebar
        isOpen={isAISidebarOpen}
        onClose={() => setIsAISidebarOpen(false)}
        context={{
          tool: 'Study Plan',
          studySet: null,
          workspace: null
        }}
      />
    </div>
  );
}
