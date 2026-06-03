'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Folder, ArrowLeft, Plus, FileText, BookOpen, ClipboardList, Upload, BarChart3, MessageSquare, Loader2, Clock, Sparkles, TrendingUp, Calendar, CheckCircle, XCircle } from 'lucide-react';
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
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

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
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-gray-500">Progress</p>
              <p className="text-lg font-semibold text-gray-900">32%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Last Studied</p>
              <p className="text-sm font-medium text-gray-900">2 hours ago</p>
            </div>
            <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Assistant
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{resources.notes.length}</p>
                <p className="text-sm text-gray-500">Notes</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{resources.flashcards.length}</p>
                <p className="text-sm text-gray-500">Flashcards</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}>
                <ClipboardList className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{resources.quizzes.length}</p>
                <p className="text-sm text-gray-500">Quizzes</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}}>
                <Upload className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{resources.files.length}</p>
                <p className="text-sm text-gray-500">Files</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">4.5h</p>
                <p className="text-sm text-gray-500">Study Time</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-8 bg-white">
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-50 text-purple-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
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
            /* Insights Tab - Show recent activity */
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
              <div className="space-y-4">
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Generated 30 flashcards</p>
                      <p className="text-sm text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Completed Quiz 4</p>
                      <p className="text-sm text-gray-500">Score: 85% • 3 hours ago</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Upload className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Uploaded Economics.pdf</p>
                      <p className="text-sm text-gray-500">5 hours ago</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">AI updated notes</p>
                      <p className="text-sm text-gray-500">Yesterday</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            /* Other tabs - show existing content with create buttons */
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h2>
                {activeTab === 'notes' && (
                  <Button onClick={() => router.push('/dashboard/notes/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Note
                  </Button>
                )}
                {activeTab === 'flashcards' && (
                  <Button onClick={() => router.push('/dashboard/flashcards/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Flashcards
                  </Button>
                )}
                {activeTab === 'quizzes' && (
                  <Button onClick={() => router.push('/dashboard/quizzes/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quiz
                  </Button>
                )}
                {activeTab === 'files' && (
                  <Button onClick={() => setIsFileModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                )}
              </div>

              {/* Resource Grid */}
              {hasResources ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {resources[activeTab]?.map((item) => (
                    <Card key={item.id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                          <ActiveIcon className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{item.title || item.topic || item.filename}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{item.summary || item.description || ''}</p>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <ActiveIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No {activeTab} yet</h3>
                  <p className="text-gray-500 mb-6">Create your first {activeTab.slice(0, -1)} to get started</p>
                  <Button onClick={() => {
                    if (activeTab === 'notes') router.push('/dashboard/notes/create');
                    if (activeTab === 'flashcards') router.push('/dashboard/flashcards/create');
                    if (activeTab === 'quizzes') router.push('/dashboard/quizzes/create');
                    if (activeTab === 'files') setIsFileModalOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create {activeTab.slice(0, -1).charAt(0).toUpperCase() + activeTab.slice(0, -1).slice(1)}
                  </Button>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File Upload Dialog */}
      <Dialog open={isFileModalOpen} onOpenChange={setIsFileModalOpen}>
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
              {isGenerating ? 'Adding...' : 'Add to Study Set'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
