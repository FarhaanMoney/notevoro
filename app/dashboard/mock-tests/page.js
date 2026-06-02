'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Plus, CheckCircle, Clock, Play, ChevronLeft, ChevronRight, X, Loader2, Sparkles, FileText, Zap, Upload, Copy, Share2, Target, Award, TrendingUp, Trash2, Folder } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AISidebar from '@/components/AISidebar';
import WorkspaceTopBar from '@/components/workspace/WorkspaceTopBar';
import FeatureDashboard from '@/components/workspace/FeatureDashboard';

export default function MockTestsPage({ user }) {
  const [mockTests, setMockTests] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [sections, setSections] = useState('3');
  const [activeTest, setActiveTest] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  useEffect(() => {
    loadMockTests();
    loadWorkspaces();
  }, []);

  useEffect(() => {
    let interval;
    if (timerActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && timerActive) {
      setTimerActive(false);
      calculateScore();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining]);

  const loadMockTests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/mock-tests', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMockTests(data.mockTests || []);
      }
    } catch (error) {
      console.error('Failed to load mock tests:', error);
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
        console.log('Mock tests page: Loaded workspaces:', data);
      }
    } catch (error) {
      console.error('Mock tests page: Failed to load workspaces:', error);
    }
  };

  const handleCreateMockTest = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    console.log('Mock tests page: Selected workspace:', selectedWorkspace);
    console.log('Mock tests page: Creating mock test with topic:', topic.trim());

    setIsGenerating(true);
    setError(null);

    try {
      const payload = {
        topic: topic.trim(),
        difficulty,
        sections: parseInt(sections),
        fileUrl: uploadedFile?.url,
        workspaceId: selectedWorkspace?.id,
      };
      
      console.log('Mock tests page: Mock test creation payload:', payload);
      
      const response = await fetch('/api/mock-tests', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create mock test');
      }

      const data = await response.json();
      setMockTests([data.mockTest, ...mockTests]);
      setIsModalOpen(false);
      setTopic('');
      setDifficulty('medium');
      setSections('3');
      setUploadedFile(null);
    } catch (error) {
      console.error('Mock test creation error:', error);
      setError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartTest = (test) => {
    setActiveTest(test);
    setCurrentSection(0);
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
    setTimeRemaining(test.sections.length * 5 * 60); // 5 minutes per section
    setTimerActive(true);
  };

  const handleAnswerSelect = (answerIndex) => {
    const key = `${currentSection}-${currentQuestion}`;
    setSelectedAnswers((prev) => ({ ...prev, [key]: answerIndex }));
  };

  const handleNextQuestion = () => {
    const currentSectionData = activeTest.sections[currentSection];
    if (currentQuestion < currentSectionData.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else if (currentSection < activeTest.sections.length - 1) {
      setCurrentSection((prev) => prev + 1);
      setCurrentQuestion(0);
    } else {
      calculateScore();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    } else if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1);
      setCurrentQuestion(activeTest.sections[currentSection - 1].questions.length - 1);
    }
  };

  const calculateScore = () => {
    setTimerActive(false);
    let correctCount = 0;
    let totalQuestions = 0;

    activeTest.sections.forEach((section, sectionIndex) => {
      section.questions.forEach((question, questionIndex) => {
        totalQuestions++;
        const key = `${sectionIndex}-${questionIndex}`;
        if (selectedAnswers[key] === question.correct_answer) {
          correctCount++;
        }
      });
    });

    setScore(Math.round((correctCount / totalQuestions) * 100));
    setShowResults(true);
  };

  const handleBackToTests = () => {
    setActiveTest(null);
    setShowResults(false);
    setTimerActive(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'mock-tests');

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

  const hasMockTests = mockTests.length > 0;

  // Calculate statistics for dashboard
  const stats = {
    totalItems: mockTests.length,
    createdThisWeek: 0, // Would need to calculate from created_at
    averageScore: mockTests.length > 0 ? Math.round(mockTests.reduce((acc, t) => acc + (t.score || 0), 0) / mockTests.length) : 0,
    bestScore: mockTests.length > 0 ? Math.max(...mockTests.map(t => t.score || 0)) : 0,
    completionRate: mockTests.length > 0 ? Math.round((mockTests.filter(t => t.completed).length / mockTests.length) * 100) : 0,
  };

  // Active test view
  if (activeTest && !showResults) {
    const section = activeTest.sections[currentSection];
    const question = section.questions[currentQuestion];
    const totalQuestions = activeTest.sections.reduce((sum, s) => sum + s.questions.length, 0);
    const answeredQuestions = Object.keys(selectedAnswers).length;
    const progress = ((answeredQuestions) / totalQuestions) * 100;

    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={handleBackToTests}>
                <X className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-page-title text-gray-900">{activeTest.title}</h1>
                <p className="text-body text-gray-500 mt-1">
                  Section {currentSection + 1} of {activeTest.sections.length} • Question {currentQuestion + 1} of {section.questions.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-5 w-5" />
                <span className="text-lg font-medium">
                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <Card className="premium-card p-8">
              <div className="mb-6">
                <h2 className="text-section-title text-gray-900 mb-2">{section.name}</h2>
                <p className="text-body text-gray-700">{question.question}</p>
              </div>

              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedAnswers[`${currentSection}-${currentQuestion}`] === index
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{String.fromCharCode(65 + index)}.</span> {option}
                  </button>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handlePreviousQuestion}
                  disabled={currentSection === 0 && currentQuestion === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={handleNextQuestion}>
                  {currentSection === activeTest.sections.length - 1 && 
                   currentQuestion === section.questions.length - 1 ? 'Submit' : 'Next'}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Results view
  if (activeTest && showResults) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title text-gray-900">Test Results</h1>
              <p className="text-body text-gray-500 mt-1">{activeTest.title}</p>
            </div>
            <Button onClick={handleBackToTests}>
              Back to Tests
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <Card className="premium-card p-8 text-center">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl font-bold text-white">{score}%</span>
              </div>
              <h2 className="text-section-title text-gray-900 mb-2">
                {score >= 70 ? 'Great Job!' : score >= 50 ? 'Good Effort!' : 'Keep Practicing!'}
              </h2>
              <p className="text-body text-gray-500 mb-8">
                {score >= 70 ? 'You demonstrated strong understanding of the material.' : 
                 score >= 50 ? 'You have a good foundation but there\'s room for improvement.' :
                 'Review the material and try again to improve your score.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {activeTest.sections.map((section, index) => {
                  const sectionCorrect = section.questions.filter((q, qIndex) => 
                    selectedAnswers[`${index}-${qIndex}`] === q.correct_answer
                  ).length;
                  const sectionScore = Math.round((sectionCorrect / section.questions.length) * 100);
                  
                  return (
                    <Card key={index} className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-2">{section.name}</h3>
                      <p className="text-3xl font-bold text-purple-600">{sectionScore}%</p>
                      <p className="text-sm text-gray-500">{sectionCorrect}/{section.questions.length} correct</p>
                    </Card>
                  );
                })}
              </div>

              <Button size="lg" onClick={handleBackToTests}>
                Take Another Test
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!hasMockTests) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <WorkspaceTopBar
          workspaceName={selectedWorkspace?.title}
          featureName="Mock Tests"
          onSearch={(query) => setSearchQuery(query)}
          showExport={false}
          showFullscreen={false}
        />
        
        <FeatureDashboard
          featureType="mock-tests"
          stats={stats}
        />

        {/* Enhanced Empty State */}
        <div className="flex-1 flex items-center justify-center px-6 bg-gray-50">
          <div className="text-center max-w-2xl">
            <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Practice with Full-Length Exams</h2>
            <p className="text-gray-500 mb-8">
              Create AI-powered mock tests from your notes, uploaded files, or any topic. 
              Simulate real exam conditions and track your progress over time.
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
                <h3 className="font-semibold text-gray-900 mb-1">From Notes</h3>
                <p className="text-xs text-gray-500">Use your existing notes</p>
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
                  Create Mock Test
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create AI Mock Test</DialogTitle>
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
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Difficulty</label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Number of Sections</label>
                    <Select value={sections} onValueChange={setSections}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 Sections</SelectItem>
                        <SelectItem value="3">3 Sections</SelectItem>
                        <SelectItem value="4">4 Sections</SelectItem>
                        <SelectItem value="5">5 Sections</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <Button onClick={handleCreateMockTest} disabled={isGenerating} className="w-full">
                    {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    {isGenerating ? 'Generating...' : 'Generate Mock Test'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <WorkspaceTopBar
        workspaceName={selectedWorkspace?.title}
        featureName="Mock Tests"
        onSearch={(query) => setSearchQuery(query)}
        showExport={false}
        showFullscreen={false}
      />
      
      <FeatureDashboard
        featureType="mock-tests"
        stats={stats}
      />

      {/* Quick Actions Bar */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsModalOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Mock Test
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
                <SelectItem value="score">Score</SelectItem>
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
              {mockTests.map((test) => (
                <Card key={test.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                        <ClipboardList className="h-6 w-6 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white flex items-center justify-center shadow-md border border-gray-200">
                        <span className="text-xs font-bold text-purple-600">{test.sections?.length || 3}</span>
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
                  <h3 className="font-semibold text-gray-900 mb-2">{test.title || 'Untitled Mock Test'}</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Folder className="h-4 w-4" />
                      <span>{test.topic || 'General'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Target className="h-4 w-4" />
                      <span>Difficulty: {test.difficulty || 'medium'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <ClipboardList className="h-4 w-4" />
                      <span>{test.sections?.length || 3} sections</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>Last attempt: Today</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleStartTest(test)} className="flex-1" size="sm">
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                    <Button variant="outline" onClick={() => handleStartTest(test)} className="flex-1" size="sm">
                      <Award className="h-4 w-4 mr-2" />
                      Review
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
          tool: 'Mock Tests',
          workspace: selectedWorkspace
        }}
      />
      
      {/* Create Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create AI Mock Test</DialogTitle>
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
              <label className="text-sm font-medium text-gray-700 mb-2 block">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Number of Sections</label>
              <Select value={sections} onValueChange={setSections}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 Sections</SelectItem>
                  <SelectItem value="3">3 Sections</SelectItem>
                  <SelectItem value="4">4 Sections</SelectItem>
                  <SelectItem value="5">5 Sections</SelectItem>
                </SelectContent>
              </Select>
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
            <Button onClick={handleCreateMockTest} disabled={isGenerating} className="w-full">
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              {isGenerating ? 'Generating...' : 'Generate Mock Test'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
