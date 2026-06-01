'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { NotebookPen, Plus, ArrowRight, Loader2, FileText, Folder, Upload, Sparkles, Zap, Copy, Share2, Clock, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import UpgradeModal from '@/components/UpgradeModal';
import WorkspaceTopBar from '@/components/workspace/WorkspaceTopBar';
import FeatureDashboard from '@/components/workspace/FeatureDashboard';

const suggestedTopics = [
  'Photosynthesis',
  'Thermodynamics',
  'World War II',
  'Organic Chemistry',
];

export default function NotesPage({ user }) {
  const [notes, setNotes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  useEffect(() => {
    loadNotes();
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
        setWorkspaces(data.workspaces || []);
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      console.log('Notes page: Loading notes...');
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      console.log('Notes page: Session:', session);
      console.log('Notes page: Session user:', session?.user);
      console.log('Notes page: Access token exists:', !!session?.access_token);
      
      const response = await fetch('/api/notes', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      console.log('Notes page: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNote = async () => {
    if (!topic.trim() && !text.trim()) {
      setError('Please enter a topic or paste text');
      return;
    }

    console.log('Notes page: Selected workspace:', selectedWorkspace);
    console.log('Notes page: Creating note with topic:', topic.trim());

    setIsGenerating(true);
    setError(null);

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      const payload = {
        topic: topic.trim(),
        text: text.trim(),
        sourceType: uploadedFile ? 'file' : (text.trim() ? 'text' : 'topic'),
        fileUrl: uploadedFile?.url,
        workspaceId: selectedWorkspace?.id,
      };
      
      console.log('Notes page: Note creation payload:', payload);
      
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          setShowUpgradeModal(true);
          setIsGenerating(false);
          return;
        }
        throw new Error(errorData.error || 'Failed to create note');
      }

      const data = await response.json();
      setNotes([data.note, ...notes]);
      setIsModalOpen(false);
      setTopic('');
      setText('');
      setUploadedFile(null);
    } catch (error) {
      console.error('Note creation error:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTopicClick = (selectedTopic) => {
    setTopic(selectedTopic);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'notes');

      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const data = await response.json();
      setUploadedFile(data);
    } catch (error) {
      console.error('File upload error:', error);
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const hasNotes = notes.length > 0;

  // Calculate statistics for dashboard
  const stats = {
    totalItems: notes.length,
    createdThisWeek: 0, // Would need to calculate from created_at
    studyTime: '0h',
    aiActivity: 0,
  };

  if (!hasNotes) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <WorkspaceTopBar
          workspaceName={selectedWorkspace?.title}
          featureName="Notes"
          onSearch={(query) => setSearchQuery(query)}
          showExport={false}
          showFullscreen={false}
        />
        
        <FeatureDashboard
          featureType="notes"
          stats={stats}
        />

        {/* Enhanced Empty State */}
        <div className="flex-1 flex items-center justify-center px-6 bg-gray-50">
          <div className="text-center max-w-2xl">
            <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <NotebookPen className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Create Smart Study Notes</h2>
            <p className="text-gray-500 mb-8">
              Generate AI-powered structured study notes from any topic, text, or uploaded file. 
              Organize your learning with summaries, key concepts, and definitions.
            </p>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <Zap className="h-6 w-6 text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">From Topic</h3>
                <p className="text-xs text-gray-500">Generate from any subject</p>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <FileText className="h-6 w-6 text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">From Text</h3>
                <p className="text-xs text-gray-500">Paste your content</p>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <Upload className="h-6 w-6 text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">From File</h3>
                <p className="text-xs text-gray-500">Upload PDF, DOCX, TXT</p>
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
              >
                <Sparkles className="h-6 w-6 text-purple-500 mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">AI Generate</h3>
                <p className="text-xs text-gray-500">Let AI create for you</p>
              </button>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="px-8">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Note
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create AI Notes</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Topic</label>
                    <Input
                      placeholder="Enter a topic..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Or paste text</label>
                    <Textarea
                      placeholder="Paste your text here..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Or upload a file (PDF, Image)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                    {isUploading && (
                      <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading...
                      </p>
                    )}
                    {uploadedFile && (
                      <p className="text-sm text-green-600 mt-2">
                        ✓ {uploadedFile.name} uploaded
                      </p>
                    )}
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm">{error}</p>
                  )}
                  <Button onClick={handleCreateNote} disabled={isGenerating} className="w-full">
                    {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isGenerating ? 'Generating...' : 'Generate Notes'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <WorkspaceTopBar
        workspaceName={selectedWorkspace?.title}
        featureName="Notes"
        onSearch={(query) => setSearchQuery(query)}
        showExport={false}
        showFullscreen={false}
      />
      
      <FeatureDashboard
        featureType="notes"
        stats={stats}
      />

      {/* Quick Actions Bar */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsModalOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Note
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
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <Skeleton className="h-8 w-full" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map((note) => (
                <Card key={note.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                        <NotebookPen className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
                        <Copy className="h-4 w-4 text-gray-500" />
                      </button>
                      <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
                        <Share2 className="h-4 w-4 text-gray-500" />
                      </button>
                      <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{note.title || 'Untitled Note'}</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Folder className="h-4 w-4" />
                      <span>{note.topic || 'General'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>Last edited: Today</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => window.location.href = `/dashboard/notes/${note.id}`} className="flex-1" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Open
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Create Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create AI Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Topic</label>
              <Input
                placeholder="Enter a topic..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Or paste text</label>
              <Textarea
                placeholder="Paste your text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Or upload a file (PDF, Image)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              {isUploading && (
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </p>
              )}
              {uploadedFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {uploadedFile.name} uploaded
                </p>
              )}
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <Button onClick={handleCreateNote} disabled={isGenerating} className="w-full">
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {isGenerating ? 'Generating...' : 'Generate Notes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Notes"
      />
    </div>
  );
}
