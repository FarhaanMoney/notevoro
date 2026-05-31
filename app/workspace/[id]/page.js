'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder, ArrowLeft, Plus, FileText, BookOpen, ClipboardList, Upload, BarChart3, MessageSquare, Loader2, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const tabs = [
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
  { id: 'quizzes', label: 'Quizzes', icon: ClipboardList },
  { id: 'files', label: 'Files', icon: Upload },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
];

export default function WorkspaceDetailPage({ user }) {
  const params = useParams();
  const router = useRouter();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes');
  const [resources, setResources] = useState({
    notes: [],
    flashcards: [],
    quizzes: [],
    files: [],
  });
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [noteTopic, setNoteTopic] = useState('');
  const [noteText, setNoteText] = useState('');
  const [flashcardTopic, setFlashcardTopic] = useState('');
  const [quizTopic, setQuizTopic] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadWorkspace();
  }, [params.id]);

  useEffect(() => {
    if (workspace) {
      loadResources();
    }
  }, [workspace, activeTab]);

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      const response = await fetch(`/api/workspaces/${params.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkspace(data.workspace);
      } else {
        router.push('/workspace');
      }
    } catch (error) {
      console.error('Failed to load workspace:', error);
      router.push('/workspace');
    } finally {
      setLoading(false);
    }
  };

  const loadResources = async () => {
    if (!workspace) return;

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();

      // Load all resources for insights
      const notesRes = await fetch(`/api/workspaces/${params.id}/notes`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setResources(prev => ({ ...prev, notes: notesData.notes || [] }));
      }

      const flashcardsRes = await fetch(`/api/workspaces/${params.id}/flashcards`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (flashcardsRes.ok) {
        const flashcardsData = await flashcardsRes.json();
        setResources(prev => ({ ...prev, flashcards: flashcardsData.flashcards || [] }));
      }

      const quizzesRes = await fetch(`/api/workspaces/${params.id}/quizzes`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        setResources(prev => ({ ...prev, quizzes: quizzesData.quizzes || [] }));
      }

      const filesRes = await fetch(`/api/workspaces/${params.id}/files`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      if (filesRes.ok) {
        const filesData = await filesRes.json();
        setResources(prev => ({ ...prev, files: filesData.files || [] }));
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  };

  const handleCreateNote = async () => {
    if (!noteTopic.trim() && !noteText.trim()) {
      return;
    }

    setIsGenerating(true);

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      // Create note first
      const noteResponse = await fetch('/api/notes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          topic: noteTopic.trim(),
          text: noteText.trim(),
          sourceType: noteText.trim() ? 'text' : 'topic',
        }),
      });

      if (!noteResponse.ok) {
        throw new Error('Failed to create note');
      }

      const noteData = await noteResponse.json();
      
      // Link note to workspace
      const linkResponse = await fetch(`/api/workspaces/${params.id}/notes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ noteId: noteData.note.id }),
      });

      if (linkResponse.ok) {
        setResources(prev => ({ ...prev, notes: [noteData.note, ...prev.notes] }));
        setIsNoteModalOpen(false);
        setNoteTopic('');
        setNoteText('');
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateFlashcard = async () => {
    if (!flashcardTopic.trim()) {
      return;
    }

    setIsGenerating(true);

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      // Create flashcard first
      const flashcardResponse = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          topic: flashcardTopic.trim(),
        }),
      });

      if (!flashcardResponse.ok) {
        throw new Error('Failed to create flashcard');
      }

      const flashcardData = await flashcardResponse.json();
      
      // Link flashcard to workspace
      const linkResponse = await fetch(`/api/workspaces/${params.id}/flashcards`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ flashcardId: flashcardData.deck.id }),
      });

      if (linkResponse.ok) {
        setResources(prev => ({ ...prev, flashcards: [flashcardData.deck, ...prev.flashcards] }));
        setIsFlashcardModalOpen(false);
        setFlashcardTopic('');
      }
    } catch (error) {
      console.error('Failed to create flashcard:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateQuiz = async () => {
    if (!quizTopic.trim()) {
      return;
    }

    setIsGenerating(true);

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      // Create quiz first
      const quizResponse = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          topic: quizTopic.trim(),
        }),
      });

      if (!quizResponse.ok) {
        throw new Error('Failed to create quiz');
      }

      const quizData = await quizResponse.json();
      
      // Link quiz to workspace
      const linkResponse = await fetch(`/api/workspaces/${params.id}/quizzes`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ quizId: quizData.quiz.id }),
      });

      if (linkResponse.ok) {
        setResources(prev => ({ ...prev, quizzes: [quizData.quiz, ...prev.quizzes] }));
        setIsQuizModalOpen(false);
        setQuizTopic('');
      }
    } catch (error) {
      console.error('Failed to create quiz:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'workspace-files');

      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      setUploadedFile(data);
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateFile = async () => {
    if (!uploadedFile) return;

    setIsGenerating(true);

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      const response = await fetch(`/api/workspaces/${params.id}/files`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          filename: uploadedFile.name,
          fileType: uploadedFile.type || 'unknown',
          fileSize: uploadedFile.size,
          storagePath: uploadedFile.url,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResources(prev => ({ ...prev, files: [data.file, ...prev.files] }));
        setIsFileModalOpen(false);
        setUploadedFile(null);
      }
    } catch (error) {
      console.error('Failed to create file:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return null;
  }

  const ActiveIcon = tabs.find(t => t.id === activeTab)?.icon || FileText;
  const hasResources = resources[activeTab]?.length > 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-6 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/workspace')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div 
              className="h-12 w-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: workspace.color }}
            >
              <Folder className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-page-title text-gray-900">{workspace.title}</h1>
              {workspace.subject && (
                <p className="text-body text-gray-500">{workspace.subject}</p>
              )}
            </div>
          </div>
          {activeTab === 'notes' && (
            <Dialog open={isNoteModalOpen} onOpenChange={setIsNoteModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Note
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Topic</label>
                    <Input
                      placeholder="Enter a topic..."
                      value={noteTopic}
                      onChange={(e) => setNoteTopic(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Or paste text</label>
                    <Textarea
                      placeholder="Paste your text here..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <Button onClick={handleCreateNote} disabled={isGenerating} className="w-full">
                    {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isGenerating ? 'Generating...' : 'Generate Note'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {activeTab === 'flashcards' && (
            <Dialog open={isFlashcardModalOpen} onOpenChange={setIsFlashcardModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Flashcards
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Generate Flashcards</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Topic</label>
                    <Input
                      placeholder="Enter a topic..."
                      value={flashcardTopic}
                      onChange={(e) => setFlashcardTopic(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCreateFlashcard} disabled={isGenerating} className="w-full">
                    {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isGenerating ? 'Generating...' : 'Generate Flashcards'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {activeTab === 'quizzes' && (
            <Dialog open={isQuizModalOpen} onOpenChange={setIsQuizModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create Quiz</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Topic</label>
                    <Input
                      placeholder="Enter a topic..."
                      value={quizTopic}
                      onChange={(e) => setQuizTopic(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCreateQuiz} disabled={isGenerating} className="w-full">
                    {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isGenerating ? 'Generating...' : 'Generate Quiz'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {activeTab === 'files' && (
            <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Upload File</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">File</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx,.ppt,.pptx"
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
                  <Button onClick={handleCreateFile} disabled={isGenerating || !uploadedFile} className="w-full">
                    {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isGenerating ? 'Adding...' : 'Add to Workspace'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'insights' ? (
            /* Insights Tab */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="premium-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="text-2xl font-bold text-gray-900">{resources.notes.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="premium-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Flashcards</p>
                    <p className="text-2xl font-bold text-gray-900">{resources.flashcards.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="premium-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}>
                    <ClipboardList className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Quizzes</p>
                    <p className="text-2xl font-bold text-gray-900">{resources.quizzes.length}</p>
                  </div>
                </div>
              </Card>
              <Card className="premium-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}}>
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Files</p>
                    <p className="text-2xl font-bold text-gray-900">{resources.files.length}</p>
                  </div>
                </div>
              </Card>
            </div>
          ) : !hasResources ? (
            /* Empty State */
            <div className="flex items-center justify-center py-16">
              <div className="text-center max-w-md">
                <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
                  <ActiveIcon className="h-10 w-10 text-gray-400" />
                </div>
                <h2 className="text-section-title text-gray-900 mb-3">
                  No {tabs.find(t => t.id === activeTab)?.label} Yet
                </h2>
                <p className="text-body text-gray-500 mb-8">
                  {activeTab === 'notes' && 'Create your first note in this workspace.'}
                  {activeTab === 'flashcards' && 'Generate flashcards from your notes or files.'}
                  {activeTab === 'quizzes' && 'Create a quiz to test your knowledge.'}
                  {activeTab === 'files' && 'Upload files to generate study materials.'}
                  {activeTab === 'insights' && 'Complete some activities to see insights.'}
                </p>
                {activeTab === 'notes' && (
                  <Button size="lg" onClick={() => setIsNoteModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Note
                  </Button>
                )}
                {activeTab === 'flashcards' && (
                  <Button size="lg" onClick={() => setIsFlashcardModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Flashcards
                  </Button>
                )}
                {activeTab === 'quizzes' && (
                  <Button size="lg" onClick={() => setIsQuizModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quiz
                  </Button>
                )}
                {activeTab === 'files' && (
                  <Button size="lg" onClick={() => setIsFileModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Resource List */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources[activeTab].map((resource) => (
                <Card key={resource.id} className="premium-card p-6 cursor-pointer hover:shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                      <ActiveIcon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(resource.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-card-title text-gray-900 mb-2">{resource.title || resource.topic || resource.filename}</h3>
                  {resource.summary && (
                    <p className="text-body text-gray-500 line-clamp-3">{resource.summary}</p>
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
