'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder, Plus, Loader2, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const iconOptions = [
  { value: 'folder', label: 'Folder' },
  { value: 'book', label: 'Book' },
  { value: 'flask', label: 'Science' },
  { value: 'calculator', label: 'Math' },
  { value: 'globe', label: 'Geography' },
  { value: 'code', label: 'Programming' },
  { value: 'music', label: 'Music' },
  { value: 'palette', label: 'Art' },
];

const colorOptions = [
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
];

export default function WorkspaceListPage({ user }) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [selectedColor, setSelectedColor] = useState('#8b5cf6');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    setIsLoading(true);
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      const response = await fetch('/api/workspaces', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkspaces(data.workspaces || []);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateWorkspace = async () => {
    if (!title.trim()) {
      setError('Please enter a workspace title');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          title: title.trim(),
          subject: subject.trim(),
          description: description.trim(),
          icon: selectedIcon,
          color: selectedColor,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create workspace');
      }

      const data = await response.json();
      setWorkspaces([data.workspace, ...workspaces]);
      setIsModalOpen(false);
      setTitle('');
      setSubject('');
      setDescription('');
      setSelectedIcon('folder');
      setSelectedColor('#8b5cf6');
      
      // Redirect to workspace detail
      router.push(`/workspace/${data.workspace.id}`);
    } catch (error) {
      console.error('Workspace creation error:', error);
      setError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleWorkspaceClick = (workspaceId) => {
    router.push(`/workspace/${workspaceId}`);
  };

  const hasWorkspaces = workspaces.length > 0;

  if (!hasWorkspaces) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title text-gray-900">Study Sets</h1>
              <p className="text-body text-gray-500 mt-1">Organize your study materials into projects.</p>
            </div>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Study Set
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Study Set</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Title</label>
                    <Input
                      placeholder="e.g., Biology Final Exam"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Subject</label>
                    <Input
                      placeholder="e.g., Biology"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
                    <Textarea
                      placeholder="What's this workspace about?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Icon</label>
                    <div className="flex gap-2 flex-wrap">
                      {iconOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSelectedIcon(option.value)}
                          className={`px-3 py-2 rounded-lg border-2 transition-all ${
                            selectedIcon === option.value
                              ? 'border-black bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            selectedColor === color
                              ? 'border-black scale-110'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}
                  <Button onClick={handleCreateWorkspace} disabled={isCreating} className="w-full">
                    {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isCreating ? 'Creating...' : 'Create Study Set'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <Folder className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-section-title text-gray-900 mb-3">Create Your First Study Set</h2>
            <p className="text-body text-gray-500 mb-8">
              Organize your notes, flashcards, quizzes, and files into study projects.
            </p>
            <Button size="lg" onClick={() => setIsModalOpen(true)}>
              Create Study Set
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-6 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-page-title text-gray-900">Study Sets</h1>
            <p className="text-body text-gray-500 mt-1">Organize your study materials into projects.</p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Study Set
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Study Set</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Title</label>
                  <Input
                    placeholder="e.g., Biology Final Exam"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Subject</label>
                  <Input
                    placeholder="e.g., Biology"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
                  <Textarea
                    placeholder="What's this study set about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Icon</label>
                  <div className="flex gap-2 flex-wrap">
                    {iconOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedIcon(option.value)}
                        className={`px-3 py-2 rounded-lg border-2 transition-all ${
                          selectedIcon === option.value
                            ? 'border-black bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          selectedColor === color
                            ? 'border-black scale-110'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}
                <Button onClick={handleCreateWorkspace} disabled={isCreating} className="w-full">
                  {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  {isCreating ? 'Creating...' : 'Create Workspace'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="premium-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-in">
              {workspaces.map((workspace) => (
                <Card 
                  key={workspace.id} 
                  className="premium-card p-6 cursor-pointer card-hover card-press"
                  onClick={() => handleWorkspaceClick(workspace.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="h-12 w-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: workspace.color }}
                    >
                      <Folder className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(workspace.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-card-title text-gray-900 mb-1">{workspace.title}</h3>
                  {workspace.subject && (
                    <p className="text-sm text-gray-500 mb-2">{workspace.subject}</p>
                  )}
                  {workspace.description && (
                    <p className="text-body text-gray-500 line-clamp-2">{workspace.description}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
