'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Plus, CheckCircle, Loader2, RotateCw, ChevronLeft, ChevronRight, X, Folder } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function FlashcardsPage({ user }) {
  const [flashcards, setFlashcards] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [topic, setTopic] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isStudying, setIsStudying] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  useEffect(() => {
    loadFlashcards();
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

  const loadFlashcards = async () => {
    setIsLoading(true);
    try {
      console.log('Flashcards page: Loading flashcards...');
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      console.log('Flashcards page: Session:', session);
      console.log('Flashcards page: Session user:', session?.user);
      console.log('Flashcards page: Access token exists:', !!session?.access_token);
      
      const response = await fetch('/api/flashcards', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      console.log('Flashcards page: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setFlashcards(data.flashcards || []);
      }
    } catch (error) {
      console.error('Failed to load flashcards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFlashcards = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ topic: topic.trim(), fileUrl: uploadedFile?.url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create flashcards');
      }

      const data = await response.json();
      setFlashcards([...flashcards, ...data.flashcards]);
      setIsModalOpen(false);
      setTopic('');
      setUploadedFile(null);
      setIsStudying(true);
      setCurrentIndex(flashcards.length);
    } catch (error) {
      console.error('Flashcard creation error:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartStudying = () => {
    setIsStudying(true);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleRateCard = async (isCorrect) => {
    const currentCard = flashcards[currentIndex];
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      await fetch('/api/flashcards', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ flashcardId: currentCard.id, isCorrect }),
      });

      const updatedFlashcards = [...flashcards];
      updatedFlashcards[currentIndex] = { ...currentCard, mastery_level: isCorrect ? Math.min(5, currentCard.mastery_level + 1) : Math.max(0, currentCard.mastery_level - 1) };
      setFlashcards(updatedFlashcards);

      if (currentIndex < flashcards.length - 1) {
        handleNext();
      } else {
        setIsStudying(false);
      }
    } catch (error) {
      console.error('Failed to update flashcard:', error);
    }
  };

  const handleStopStudying = () => {
    setIsStudying(false);
    setIsFlipped(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'flashcards');

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

  const hasFlashcards = flashcards.length > 0;

  if (isStudying && hasFlashcards) {
    const currentCard = flashcards[currentIndex];
    const progress = ((currentIndex + 1) / flashcards.length) * 100;

    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title text-gray-900">Study Mode</h1>
              <p className="text-body text-gray-500 mt-1">Card {currentIndex + 1} of {flashcards.length}</p>
            </div>
            <Button onClick={handleStopStudying} variant="outline">
              <X className="h-4 w-4 mr-2" />
              Exit
            </Button>
          </div>
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-8 bg-gray-50">
          <div className="max-w-2xl w-full">
            <div
              className="premium-card p-8 min-h-[300px] cursor-pointer relative transition-transform duration-500"
              style={{ transformStyle: 'preserve-3d' }}
              onClick={handleFlip}
            >
              <div className="absolute top-4 right-4">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleFlip(); }}>
                  <RotateCw className="h-5 w-5 text-gray-400" />
                </Button>
              </div>
              {!isFlipped ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-section-title text-gray-900 text-center">{currentCard.front}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-body text-gray-700 text-center">{currentCard.back}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-6">
              <Button onClick={handlePrevious} disabled={currentIndex === 0} variant="outline">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <div className="flex gap-3">
                <Button onClick={() => handleRateCard(false)} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                  Hard
                </Button>
                <Button onClick={() => handleRateCard(true)} className="text-green-600 bg-green-50 border-green-200 hover:bg-green-100">
                  Easy
                </Button>
              </div>
              <Button onClick={handleNext} disabled={currentIndex === flashcards.length - 1} variant="outline">
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">Mastery: {currentCard.mastery_level}/5</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasFlashcards) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title text-gray-900">Flashcards</h1>
              <p className="text-body text-gray-500 mt-1">Generate flashcards and study using active recall.</p>
            </div>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Flashcards
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create AI Flashcards</DialogTitle>
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
                  <Button onClick={handleCreateFlashcard} disabled={isGenerating} className="w-full">
                    {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isGenerating ? 'Generating...' : 'Generate Flashcards'}
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
                  All Flashcards
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

        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-section-title text-gray-900 mb-3">Create Flashcards</h2>
            <p className="text-body text-gray-500 mb-8">
              Generate flashcards and study using active recall.
            </p>
            <Button size="lg" onClick={() => setIsModalOpen(true)}>
              Create Flashcards
            </Button>
          </div>
        </div>

        <div className="px-8 pb-8">
          <Card className="premium-card p-8">
            <h3 className="text-card-title text-gray-900 mb-4">Benefits</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Spaced repetition</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Memory retention</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Active recall</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Long-term learning</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <div className="border-b border-gray-200 px-8 py-6 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-page-title text-gray-900">Flashcards</h1>
            <p className="text-body text-gray-500 mt-1">Generate flashcards and study using active recall.</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleStartStudying} variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              Study
            </Button>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create AI Flashcards</DialogTitle>
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
                  <Button onClick={handleCreateFlashcard} disabled={isGenerating} className="w-full">
                    {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isGenerating ? 'Generating...' : 'Generate Flashcards'}
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
                  All Flashcards
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
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="premium-card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {flashcards.map((flashcard, index) => (
                <Card key={flashcard.id} className="premium-card p-6 cursor-pointer hover:shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs text-gray-400">Mastery: {flashcard.mastery_level}/5</span>
                  </div>
                  <p className="text-body text-gray-700 line-clamp-2 mb-4">{flashcard.front}</p>
                  <p className="text-sm text-gray-500">Reviewed {flashcard.review_count} times</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
