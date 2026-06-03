'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Plus, CheckCircle, Play, Clock, Folder, Edit2, Trash2, Copy, Share2, Target, Sparkles, Award } from 'lucide-react';
import AISidebar from '@/components/AISidebar';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import WorkspaceTopBar from '@/components/workspace/WorkspaceTopBar';

export default function QuizzesPage({ user }) {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  useEffect(() => {
    loadQuizzes();
    loadWorkspaces();
  }, []);

  const loadQuizzes = async () => {
    setIsLoading(true);
    try {
      console.log('Quizzes page: Loading quizzes...');
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      console.log('Quizzes page: Session:', session);
      console.log('Quizzes page: Session user:', session?.user);
      console.log('Quizzes page: Access token exists:', !!session?.access_token);
      
      const response = await fetch('/api/quizzes', {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      console.log('Quizzes page: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes || []);
      }
    } catch (error) {
      console.error('Failed to load quizzes:', error);
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
        console.log('Quizzes page: Loaded workspaces:', data);
      }
    } catch (error) {
      console.error('Quizzes page: Failed to load workspaces:', error);
    }
  };

  const handleStartQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
  };

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: answerIndex
    });
  };

  const handleNextQuestion = () => {
    if (currentQuestion < activeQuiz.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateScore();
    }
  };

  const calculateScore = () => {
    let correctCount = 0;
    activeQuiz.questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correct_answer) {
        correctCount++;
      }
    });
    setScore(correctCount);
    setShowResults(true);
  };

  const handleBackToQuizzes = () => {
    setActiveQuiz(null);
    setShowResults(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'quizzes');

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

  const hasQuizzes = quizzes.length > 0;

  // Calculate statistics for dashboard
  const stats = {
    totalItems: quizzes.length,
    createdThisWeek: 0, // Would need to calculate from created_at
    averageScore: quizzes.length > 0 ? Math.round(quizzes.reduce((acc, q) => acc + (q.score || 0), 0) / quizzes.length) : 0,
    bestScore: quizzes.length > 0 ? Math.max(...quizzes.map(q => q.score || 0)) : 0,
    totalQuestions: quizzes.reduce((acc, q) => acc + (q.questions?.length || 0), 0),
  };

  if (activeQuiz && !showResults) {
    const question = activeQuiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / activeQuiz.questions.length) * 100;

    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title text-gray-900">{activeQuiz.title}</h1>
              <p className="text-body text-gray-500 mt-1">Question {currentQuestion + 1} of {activeQuiz.questions.length}</p>
            </div>
            <Button onClick={handleBackToQuizzes} variant="outline">
              Exit Quiz
            </Button>
          </div>
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <Card className="premium-card p-8">
              <h2 className="text-section-title text-gray-900 mb-6">{question.question}</h2>
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(currentQuestion, index)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedAnswers[currentQuestion] === index
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-body text-gray-700">{option}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <Button
                  onClick={handleNextQuestion}
                  disabled={selectedAnswers[currentQuestion] === undefined}
                  className="ml-auto"
                >
                  {currentQuestion === activeQuiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (activeQuiz && showResults) {
    const percentage = Math.round((score / activeQuiz.questions.length) * 100);

    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <h1 className="text-page-title text-gray-900">Quiz Results</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <Card className="premium-card p-8 text-center mb-6">
              <div className="h-24 w-24 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
                <Clock className="h-12 w-12 text-purple-500" />
              </div>
              <h2 className="text-section-title text-gray-900 mb-2">
                You scored {score} out of {activeQuiz.questions.length}
              </h2>
              <p className="text-body text-gray-500 mb-6">{percentage}% correct</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleBackToQuizzes}>
                  Back to Quizzes
                </Button>
                <Button onClick={() => handleStartQuiz(activeQuiz)} variant="outline">
                  Retake Quiz
                </Button>
              </div>
            </Card>

            <Card className="premium-card p-6">
              <h3 className="text-card-title text-gray-900 mb-4">Review Answers</h3>
              <div className="space-y-4">
                {activeQuiz.questions.map((question, index) => {
                  const isCorrect = selectedAnswers[index] === question.correct_answer;
                  return (
                    <div key={index} className={`p-4 rounded-xl ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-body font-medium text-gray-900 mb-2">
                        {index + 1}. {question.question}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        Your answer: {question.options[selectedAnswers[index]]}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-gray-600">
                          Correct answer: {question.options[question.correct_answer]}
                        </p>
                      )}
                      {question.explanation && (
                        <p className="text-sm text-gray-500 mt-2 italic">{question.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!hasQuizzes) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <WorkspaceTopBar
          workspaceName={selectedWorkspace?.title}
          featureName="Quizzes"
          onSearch={(query) => setSearchQuery(query)}
          showExport={false}
          showFullscreen={false}
        />

        {/* Compact Toolbar */}
        <div className="border-b border-gray-200 px-6 py-3 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button onClick={() => router.push('/dashboard/quizzes/create')} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Quiz
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
              <ClipboardList className="h-8 w-8 text-purple-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No quizzes yet</h2>
            <p className="text-sm text-gray-500 mb-4">Create your first quiz to get started</p>
            <Button onClick={() => router.push('/dashboard/quizzes/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
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
        featureName="Quizzes"
        onSearch={(query) => setSearchQuery(query)}
        showExport={false}
        showFullscreen={false}
      />

      {/* Compact Toolbar */}
      <div className="border-b border-gray-200 px-6 py-3 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button onClick={() => router.push('/dashboard/quizzes/create')} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
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
                <SelectItem value="difficulty">Difficulty</SelectItem>
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
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                        <ClipboardList className="h-6 w-6 text-white" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-white flex items-center justify-center shadow-md border border-gray-200">
                        <span className="text-xs font-bold text-purple-600">{quiz.questions?.length || 0}</span>
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
                  <h3 className="font-semibold text-gray-900 mb-2">{quiz.title || 'Untitled Quiz'}</h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Folder className="h-4 w-4" />
                      <span>{quiz.topic || 'General'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Target className="h-4 w-4" />
                      <span>Difficulty: {quiz.difficulty || 'medium'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <ClipboardList className="h-4 w-4" />
                      <span>{quiz.questions?.length || 0} questions</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>Last attempt: Today</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleStartQuiz(quiz)} className="flex-1" size="sm">
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                    <Button variant="outline" onClick={() => handleStartQuiz(quiz)} className="flex-1" size="sm">
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
          tool: 'Quizzes',
          workspace: selectedWorkspace
        }}
      />
    </div>
  );
}
