'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Plus, CheckCircle, Loader2, Play, Clock, Folder, TrendingUp, Award, Flame, Edit2, Trash2, Upload, Sparkles } from 'lucide-react';
import UpgradeModal from '@/components/UpgradeModal';
import AISidebar from '@/components/AISidebar';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function QuizzesPage({ user }) {
  const [quizzes, setQuizzes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState('5');
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);

  useEffect(() => {
    loadQuizzes();
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

  const handleCreateQuiz = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          topic: topic.trim(),
          difficulty,
          questionCount: parseInt(questionCount),
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
        throw new Error(errorData.error || 'Failed to create quiz');
      }

      const data = await response.json();
      setQuizzes([data.quiz, ...quizzes]);
      setIsModalOpen(false);
      setTopic('');
      setDifficulty('medium');
      setQuestionCount('5');
      setUploadedFile(null);
      toast.success('Quiz created successfully');
    } catch (error) {
      console.error('Quiz creation error:', error);
      setError(error.message);
      toast.error('Failed to create quiz');
    } finally {
      setIsGenerating(false);
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
        {/* Compact Header */}
        <div className="border-b border-gray-200 px-6 py-4 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
              <p className="text-sm text-gray-500 mt-1">Create, organize and practice quizzes from your study materials.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsAISidebarOpen(true)}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quiz
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create AI Quiz</DialogTitle>
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
                      <label className="text-sm font-medium text-gray-700 mb-2 block">Number of Questions</label>
                      <Select value={questionCount} onValueChange={setQuestionCount}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 Questions</SelectItem>
                          <SelectItem value="5">5 Questions</SelectItem>
                          <SelectItem value="10">10 Questions</SelectItem>
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
                    <Button onClick={handleCreateQuiz} disabled={isGenerating} className="w-full">
                      {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      {isGenerating ? 'Generating...' : 'Generate Quiz'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="border-b border-gray-200 px-6 py-3 bg-white">
          <div className="flex items-center gap-4">
            <div className="flex-1" />
            <Input
              placeholder="Search quizzes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
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

        {/* Compact Empty State */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No quizzes yet</h3>
            <p className="text-sm text-gray-500 mb-4">Create your first AI-generated quiz.</p>
            <Button onClick={() => setIsModalOpen(true)}>
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
      {/* Compact Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
            <p className="text-sm text-gray-500 mt-1">Create, organize and practice quizzes from your study materials.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAISidebarOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Assistant
            </Button>
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create AI Quiz</DialogTitle>
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
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Number of Questions</label>
                  <Select value={questionCount} onValueChange={setQuestionCount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Questions</SelectItem>
                      <SelectItem value="5">5 Questions</SelectItem>
                      <SelectItem value="10">10 Questions</SelectItem>
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
                <Button onClick={handleCreateQuiz} disabled={isGenerating} className="w-full">
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  {isGenerating ? 'Generating...' : 'Generate Quiz'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-gray-200 px-6 py-3 bg-white">
        <div className="flex items-center gap-4">
          <div className="flex-1" />
          <Input
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {/* Performance Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">78%</p>
                  <p className="text-sm text-gray-500">Avg Score</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}>
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">95%</p>
                  <p className="text-sm text-gray-500">Best Score</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
                  <ClipboardList className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{quizzes.length}</p>
                  <p className="text-sm text-gray-500">Total Quizzes</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'}}>
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">5</p>
                  <p className="text-sm text-gray-500">Day Streak</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Quizzes Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Quizzes</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-4">
                    <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-3" />
                    <Skeleton className="h-8 w-full" />
                  </Card>
                ))}
              </div>
            ) : quizzes.length === 0 ? (
              <Card className="p-6 text-center">
                <ClipboardList className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-gray-900 mb-1">No quizzes yet</h3>
                <p className="text-xs text-gray-500 mb-3">Create your first AI-generated quiz.</p>
                <Button onClick={() => setIsModalOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-in">
                {quizzes.slice(0, 6).map((quiz) => (
                  <Card key={quiz.id} className="p-4 card-hover card-press">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                        <ClipboardList className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">{quiz.title}</h3>
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Folder className="h-3 w-3" />
                        <span>Study Set</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <ClipboardList className="h-3 w-3" />
                        <span>{quiz.questions?.length || 5} questions</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span className="capitalize">{quiz.difficulty || 'medium'}</span>
                      </div>
                      {quiz.lastScore && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Award className="h-3 w-3" />
                          <span>Last score: {quiz.lastScore}%</span>
                        </div>
                      )}
                      {quiz.lastAttempt && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>Last: {new Date(quiz.lastAttempt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <Button onClick={() => handleStartQuiz(quiz)} className="w-full" size="sm">
                      <Play className="h-3 w-3 mr-2" />
                      {quiz.lastAttempt ? 'Continue' : 'Start'}
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        feature="Quizzes"
      />
      <AISidebar
        isOpen={isAISidebarOpen}
        onClose={() => setIsAISidebarOpen(false)}
        context={{
          tool: 'Quizzes',
          studySet: selectedWorkspace,
          workspace: selectedWorkspace
        }}
      />
    </div>
  );
}
