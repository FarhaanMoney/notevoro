'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LayoutDashboard, Plus, ArrowRight, Folder, Clock, Image as ImageIcon, TrendingUp, Award, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AISidebar from '@/components/AISidebar';

const visualExamples = [
  'Mind Maps',
  'Flow Charts',
  'Concept Maps',
  'Process Diagrams',
];

export default function VisualLearningPage({ user }) {
  const [hasVisualLearning, setHasVisualLearning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [visualProjects, setVisualProjects] = useState([]);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
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
        console.log('Visual learning page: Loaded workspaces:', data);
      }
    } catch (error) {
      console.error('Visual learning page: Failed to load workspaces:', error);
    }
  };

  const handleGenerateVisual = () => {
    // TODO: Implement visual learning generation
    console.log('Generate visual learning clicked');
  };

  const handleExampleClick = (example) => {
    // TODO: Implement example selection
    console.log('Example selected:', example);
  };

  if (!hasVisualLearning) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        {/* Compact Header */}
        <div className="border-b border-gray-200 px-6 py-4 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Visual Learning</h1>
              <p className="text-sm text-gray-500 mt-1">Turn concepts into diagrams and visual aids.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAISidebarOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
              <Button onClick={handleGenerateVisual} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b border-gray-200 px-6 py-3 bg-white">
          <div className="flex items-center gap-4">
            <div className="flex-1" />
            <Input
              placeholder="Search projects..."
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
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Compact Empty State */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <LayoutDashboard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No visual projects yet</h3>
            <p className="text-sm text-gray-500 mb-4">Create your first diagram or visual aid.</p>
            <Button onClick={handleGenerateVisual}>
              <Plus className="h-4 w-4 mr-2" />
              Create Diagram
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
            <h1 className="text-2xl font-bold text-gray-900">Visual Learning</h1>
            <p className="text-sm text-gray-500 mt-1">Turn concepts into diagrams and visual aids.</p>
          </div>
          <Button onClick={handleGenerateVisual} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-gray-200 px-6 py-3 bg-white">
        <div className="flex items-center gap-4">
          <div className="flex-1" />
          <Input
            placeholder="Search projects..."
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
              <SelectItem value="type">Type</SelectItem>
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
                  <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{visualProjects.length}</p>
                  <p className="text-sm text-gray-500">Total Projects</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
                  <ImageIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">4</p>
                  <p className="text-sm text-gray-500">Types</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}>
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">2h</p>
                  <p className="text-sm text-gray-500">Avg Time</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}}>
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">95%</p>
                  <p className="text-sm text-gray-500">Accuracy</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Projects Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Projects</h2>
            {visualProjects.length === 0 ? (
              <Card className="p-6 text-center">
                <LayoutDashboard className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1">No projects yet</h3>
                <p className="text-xs text-gray-500 mb-3">Create your first diagram or visual aid.</p>
                <Button onClick={handleGenerateVisual} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-in">
                {visualProjects.map((project) => (
                  <Card key={project.id} className="p-4 card-hover card-press">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                        <ImageIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs text-gray-400 capitalize">{project.type}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">{project.title}</h3>
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Folder className="h-3 w-3" />
                        <span>Study Set</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button onClick={() => handleExampleClick(project.title)} className="w-full" size="sm">
                      <ArrowRight className="h-3 w-3 mr-2" />
                      Open
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Examples Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Diagram Types</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {visualExamples.map((example) => (
                <button
                  key={example}
                  onClick={() => handleExampleClick(example)}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors group"
                >
                  <span className="text-sm text-gray-700">{example}</span>
                  <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <AISidebar
        isOpen={isAISidebarOpen}
        onClose={() => setIsAISidebarOpen(false)}
        context={{
          tool: 'Visual Learning',
          studySet: selectedWorkspace,
          workspace: selectedWorkspace
        }}
      />
    </div>
  );
}
