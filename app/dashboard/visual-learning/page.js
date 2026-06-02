'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LayoutDashboard, Plus, ArrowRight, Folder, Clock, Image as ImageIcon, TrendingUp, Award, Sparkles, Zap, Upload, FileText, Play, Share2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AISidebar from '@/components/AISidebar';
import WorkspaceTopBar from '@/components/workspace/WorkspaceTopBar';
import FeatureDashboard from '@/components/workspace/FeatureDashboard';

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

  // Calculate statistics for dashboard
  const stats = {
    totalItems: visualProjects.length,
    createdThisWeek: 0,
    studyTime: '0h',
    aiActivity: 0,
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
        <WorkspaceTopBar
          workspaceName={selectedWorkspace?.title}
          featureName="Visual Learning"
          onSearch={(query) => setSearchQuery(query)}
          showExport={false}
          showFullscreen={false}
        />
        
        <FeatureDashboard
          featureType="visual-learning"
          stats={stats}
        />

        {/* Enhanced Empty State */}
        <div className="flex-1 flex items-center justify-center px-6 bg-gray-50">
          <div className="text-center max-w-2xl">
            <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <LayoutDashboard className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Create Visual Learning Aids</h2>
            <p className="text-gray-500 mb-8">
              Turn complex concepts into mind maps, flow charts, diagrams, and visual explanations. 
              AI-powered visual learning for better understanding and retention.
            </p>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <button
                onClick={handleGenerateVisual}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <Zap className="h-6 w-6 text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Quick Start</h3>
                <p className="text-xs text-gray-500">Create now</p>
              </button>
              <button
                onClick={handleGenerateVisual}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <ImageIcon className="h-6 w-6 text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Mind Map</h3>
                <p className="text-xs text-gray-500">Visualize ideas</p>
              </button>
              <button
                onClick={handleGenerateVisual}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <TrendingUp className="h-6 w-6 text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Flow Chart</h3>
                <p className="text-xs text-gray-500">Process steps</p>
              </button>
              <button
                onClick={() => setIsAISidebarOpen(true)}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <Sparkles className="h-6 w-6 text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">AI Generate</h3>
                <p className="text-xs text-gray-500">Auto-create</p>
              </button>
            </div>

            <Button onClick={handleGenerateVisual} size="lg" className="px-8">
              <Plus className="h-5 w-5 mr-2" />
              Create Visual Aid
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
        featureName="Visual Learning"
        onSearch={(query) => setSearchQuery(query)}
        showExport={false}
        showFullscreen={false}
      />
      
      <FeatureDashboard
        featureType="visual-learning"
        stats={stats}
      />

      {/* Quick Actions Bar */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={handleGenerateVisual} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Visual
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
                <SelectItem value="type">Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visualProjects.map((project) => (
              <Card key={project.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                    <ImageIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex gap-1">
                    <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
                      <Play className="h-4 w-4 text-gray-500" />
                    </button>
                    <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
                      <Share2 className="h-4 w-4 text-gray-500" />
                    </button>
                    <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{project.title || 'Untitled Project'}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Folder className="h-4 w-4" />
                    <span>{project.type || 'Mind Map'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Last edited: Today</span>
                  </div>
                </div>
                <Button onClick={handleGenerateVisual} className="w-full" size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  View
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
          tool: 'Visual Learning',
          workspace: selectedWorkspace
        }}
      />
    </div>
  );
}
