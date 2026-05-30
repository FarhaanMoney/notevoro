'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Plus, CheckCircle, Loader2, Play, Clock } from 'lucide-react';
import UpgradeModal from '@/components/UpgradeModal';
import { supabaseBrowser } from '@/lib/supabase/browser';

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

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    setIsLoading(true);
    try {
      console.log('Quizzes page: Loading quizzes...');
      const sb = supabaseBrowser();
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
      const sb = supabaseBrowser();
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
    } catch (error) {
      console.error('Quiz creation error:', error);
      setError(error.message);
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
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title text-gray-900">Quizzes</h1>
              <p className="text-body text-gray-500 mt-1">Test your knowledge with AI-generated questions.</p>
            </div>
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

        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-section-title text-gray-900 mb-3">Quiz Generator</h2>
            <p className="text-body text-gray-500 mb-8">
              Create quizzes with AI-generated questions on any topic.
            </p>
            <Button size="lg" onClick={() => setIsModalOpen(true)}>
              Create Quiz
            </Button>
          </div>
        </div>

        <div className="px-8 pb-8">
          <Card className="premium-card p-8">
            <h3 className="text-card-title text-gray-900 mb-4">Why Create Quizzes?</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Test your knowledge</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Identify knowledge gaps</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Track your progress</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Improve retention</p>
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
            <h1 className="text-page-title text-gray-900">Quizzes</h1>
            <p className="text-body text-gray-500 mt-1">Test your knowledge with AI-generated questions.</p>
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
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizzes.map((quiz) => (
                <Card key={quiz.id} className="premium-card p-6 cursor-pointer hover:shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                      <ClipboardList className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs text-gray-400 capitalize">{quiz.difficulty}</span>
                  </div>
                  <h3 className="text-card-title text-gray-900 mb-2">{quiz.title}</h3>
                  <p className="text-body text-gray-500 mb-4">{quiz.questions.length} questions</p>
                  <Button onClick={() => handleStartQuiz(quiz)} className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Start Quiz
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        feature="Quizzes"
      />
    </div>
  );
}
