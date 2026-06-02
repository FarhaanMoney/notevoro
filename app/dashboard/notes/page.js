'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NotebookPen, Plus, ArrowRight, Loader2, FileText, Folder, Upload, Sparkles, Zap, Copy, Share2, Clock, TrendingUp, Trash2 } from 'lucide-react';
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
  const router = useRouter();
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [creationOption, setCreationOption] = useState(null);

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

  const handleCreateBlankNote = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          title: 'Untitled Note',
          content: '',
          sourceType: 'scratch',
          workspaceId: selectedWorkspace?.id || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create note');
      }

      const data = await response.json();
      setNotes([data.note, ...notes]);
      setIsModalOpen(false);
      setCreationOption(null);
      router.push(`/dashboard/notes/${data.note.id}`);
    } catch (error) {
      console.error('Blank note creation error:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateTopicNote = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      const payload = {
        topic: topic.trim(),
        sourceType: 'topic',
        workspaceId: selectedWorkspace?.id || null,
      };
      
      console.log('Notes page: Topic note creation payload:', payload);
      
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
      setCreationOption(null);
      setTopic('');
      router.push(`/dashboard/notes/${data.note.id}`);
    } catch (error) {
      console.error('Topic note creation error:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateFileNote = async () => {
    if (!uploadedFile) {
      setError('Please upload a file');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      const payload = {
        fileUrl: uploadedFile.url,
        sourceType: 'file',
        workspaceId: selectedWorkspace?.id || null,
      };
      
      console.log('Notes page: File note creation payload:', payload);
      
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
      setCreationOption(null);
      setUploadedFile(null);
      router.push(`/dashboard/notes/${data.note.id}`);
    } catch (error) {
      console.error('File note creation error:', error);
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

        {/* Compact Toolbar */}
        <div className="border-b border-gray-200 px-6 py-3 bg-white">
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

        {/* Simple Empty State */}
        <div className="flex-1 flex items-center justify-center px-6 bg-gray-50">
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
              <NotebookPen className="h-8 w-8 text-purple-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No notes yet</h2>
            <p className="text-sm text-gray-500 mb-4">Create your first note to get started</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Note
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
        featureName="Notes"
        onSearch={(query) => setSearchQuery(query)}
        showExport={false}
        showFullscreen={false}
      />

      {/* Compact Toolbar */}
      <div className="border-b border-gray-200 px-6 py-3 bg-white">
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

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
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
                    <Button onClick={() => router.push(`/dashboard/notes/${note.id}`)} className="flex-1" size="sm">
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!creationOption ? (
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => setCreationOption('scratch')}
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <FileText className="h-8 w-8 text-purple-500 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Start From Scratch</h3>
                  <p className="text-sm text-gray-500">Create a completely empty document</p>
                </button>
                <button
                  onClick={() => setCreationOption('topic')}
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <Sparkles className="h-8 w-8 text-purple-500 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Enter a Topic</h3>
                  <p className="text-sm text-gray-500">Type any topic and AI generates complete study notes</p>
                </button>
                <button
                  onClick={() => setCreationOption('file')}
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <Upload className="h-8 w-8 text-purple-500 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Upload File / Image</h3>
                  <p className="text-sm text-gray-500">Upload PDFs, documents, slides, images, screenshots, handwritten notes</p>
                </button>
              </div>
            ) : creationOption === 'scratch' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Create a blank document to start writing from scratch.</p>
                <Button onClick={handleCreateBlankNote} disabled={isGenerating} className="w-full">
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  {isGenerating ? 'Creating...' : 'Create Blank Note'}
                </Button>
                <Button variant="outline" onClick={() => setCreationOption(null)} className="w-full">
                  Back
                </Button>
              </div>
            ) : creationOption === 'topic' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Topic</label>
                  <Input
                    placeholder="Enter a topic (e.g., Photosynthesis, World War 2, JavaScript Functions)"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}
                <Button onClick={handleCreateTopicNote} disabled={isGenerating || !topic.trim()} className="w-full">
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {isGenerating ? 'Generating...' : 'Generate Notes'}
                </Button>
                <Button variant="outline" onClick={() => setCreationOption(null)} className="w-full">
                  Back
                </Button>
              </div>
            ) : creationOption === 'file' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Upload File</label>
                  <p className="text-xs text-gray-500 mb-2">Supported: PDF, DOCX, TXT, PNG, JPG, JPEG, WEBP</p>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
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
                <Button onClick={handleCreateFileNote} disabled={isGenerating || !uploadedFile} className="w-full">
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {isGenerating ? 'Processing...' : 'Generate Notes from File'}
                </Button>
                <Button variant="outline" onClick={() => setCreationOption(null)} className="w-full">
                  Back
                </Button>
              </div>
            ) : null}
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
