'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { NotebookPen, Plus, ArrowRight, Loader2, FileText, Folder, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import UpgradeModal from '@/components/UpgradeModal';

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
          topic: topic.trim(),
          text: text.trim(),
          sourceType: uploadedFile ? 'file' : (text.trim() ? 'text' : 'topic'),
          fileUrl: uploadedFile?.url,
        }),
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

  if (!hasNotes) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title text-gray-900">Smart Notes</h1>
              <p className="text-body text-gray-500 mt-1">Generate structured study notes from any topic.</p>
            </div>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
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
          {workspaces.length > 0 && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Study Set</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedWorkspace(null)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-all ${
                    !selectedWorkspace
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  All Notes
                </button>
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => setSelectedWorkspace(workspace.id)}
                    className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-all flex items-center gap-2 ${
                      selectedWorkspace === workspace.id
                        ? 'border-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div 
                      className="h-3 w-3 rounded"
                      style={{ backgroundColor: workspace.color || '#000' }}
                    />
                    {workspace.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <NotebookPen className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-section-title text-gray-900 mb-3">Create AI Notes</h2>
            <p className="text-body text-gray-500 mb-8">
              Generate structured study notes from any topic, PDF, image, or document.
            </p>
            <Button size="lg" onClick={() => setIsModalOpen(true)}>
              Create Notes
            </Button>
          </div>
        </div>

        {/* Suggested Topics */}
        <div className="px-8 pb-8">
          <Card className="premium-card p-8">
            <h3 className="text-card-title text-gray-900 mb-4">Suggested Topics</h3>
            <div className="grid grid-cols-2 gap-3">
              {suggestedTopics.map((suggestedTopic) => (
                <button
                  key={suggestedTopic}
                  onClick={() => handleTopicClick(suggestedTopic)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <span className="text-body text-gray-700">{suggestedTopic}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
              ))}
            </div>
          </Card>
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
            <h1 className="text-page-title text-gray-900">Smart Notes</h1>
            <p className="text-body text-gray-500 mt-1">Generate structured study notes from any topic.</p>
          </div>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New
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
        {workspaces.length > 0 && (
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Workspace</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedWorkspace(null)}
                className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-all ${
                  !selectedWorkspace
                    ? 'border-black bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                All Notes
              </button>
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => setSelectedWorkspace(workspace.id)}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-all flex items-center gap-2 ${
                    selectedWorkspace === workspace.id
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div 
                    className="h-3 w-3 rounded"
                    style={{ backgroundColor: workspace.color || '#000' }}
                  />
                  {workspace.title}
                </button>
              ))}
            </div>
          </div>
        )}
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
          ) : notes.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No notes yet</h3>
              <p className="text-gray-500 mb-6">Create your first note to start studying</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate with AI
                </Button>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import from File
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-in">
              {notes.map((note) => (
                <Card 
                  key={note.id} 
                  className="premium-card p-6 cursor-pointer card-hover card-press"
                  onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-card-title text-gray-900 mb-2">{note.title}</h3>
                  <p className="text-body text-gray-500 line-clamp-3">{note.summary}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        feature="Smart Notes"
      />
    </div>
  );
}
