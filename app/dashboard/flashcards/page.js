'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Plus, CheckCircle, RotateCw, ChevronLeft, ChevronRight, X, Folder, Clock, Edit2, Trash2, Copy, Share2, Sparkles, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import AISidebar from '@/components/AISidebar';
import WorkspaceTopBar from '@/components/workspace/WorkspaceTopBar';

export default function FlashcardsPage() {
  const router = useRouter();
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isStudying, setIsStudying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  useEffect(() => {
    loadFlashcards();
    loadWorkspaces();
  }, []);

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
        console.log('Flashcards page: Loaded workspaces:', data);
      }
    } catch (error) {
      console.error('Flashcards page: Failed to load workspaces:', error);
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

  // Calculate statistics for dashboard
  const stats = {
    totalItems: flashcards.length,
    createdThisWeek: 0, // Would need to calculate from created_at
    masteredCards: flashcards.filter(f => f.mastery_level >= 4).length,
    learningCards: flashcards.filter(f => f.mastery_level >= 1 && f.mastery_level < 4).length,
    retentionRate: flashcards.length > 0 ? Math.round((flashcards.filter(f => f.mastery_level >= 3).length / flashcards.length) * 100) : 0,
  };

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
        <WorkspaceTopBar
          workspaceName={selectedWorkspace?.title}
          featureName="Flashcards"
          onSearch={(query) => setSearchQuery(query)}
          showExport={false}
          showFullscreen={false}
        />

        {/* Compact Toolbar */}
        <div className="border-b border-gray-200 px-6 py-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button onClick={() => router.push('/dashboard/flashcards/create')} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Flashcards
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
                  <SelectItem value="mastery">Mastery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Simple Empty State */}
        <div className="flex-1 flex items-center justify-center px-6 bg-gray-50">
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-purple-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No flashcards yet</h2>
            <p className="text-sm text-gray-500 mb-4">Create your first flashcard set to get started</p>
            <Button onClick={() => router.push('/dashboard/flashcards/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Flashcards
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
        featureName="Flashcards"
        onSearch={(query) => setSearchQuery(query)}
        showExport={false}
        showFullscreen={false}
      />

      {/* Compact Toolbar */}
      <div className="border-b border-gray-200 px-6 py-3 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push('/dashboard/flashcards/create')} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Flashcards
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
                <SelectItem value="mastery">Mastery</SelectItem>
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
              {flashcards.map((flashcard, index) => (
                <Card key={flashcard.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white flex items-center justify-center shadow-md border border-gray-200">
                        <span className="text-xs font-bold text-purple-600">{Math.round((flashcard.mastery_level / 5) * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
                        <Edit2 className="h-4 w-4 text-gray-500" />
                      </button>
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
                  <h3 className="font-semibold text-gray-900 mb-2">{flashcard.front?.substring(0, 40) || 'Untitled Flashcard'}</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Folder className="h-4 w-4" />
                      <span>Flashcard Set</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <BookOpen className="h-4 w-4" />
                      <span>1 card</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>Last studied: {new Date(deck.updated_at || deck.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <TrendingUp className="h-4 w-4" />
                      <span>Mastery: {flashcard.mastery_level || 0}/5</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleStartStudying()} className="flex-1" size="sm">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Study
                    </Button>
                    <Button variant="outline" onClick={() => handleStartStudying()} className="flex-1" size="sm">
                      <RotateCw className="h-4 w-4 mr-2" />
                      Test
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <AISidebar
        isOpen={isAISidebarOpen}
        onClose={() => setIsAISidebarOpen(false)}
        context={{
          tool: 'Flashcards',
          studySet: selectedWorkspace,
          workspace: selectedWorkspace
        }}
      />
    </div>
  );
}
