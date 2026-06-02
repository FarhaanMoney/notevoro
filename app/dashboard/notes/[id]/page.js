'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  NotebookPen, Plus, ArrowLeft, Loader2, FileText, Folder,
  Sparkles, MessageSquare, Download, Share, Printer, Save,
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  CheckSquare, Quote, Code, AlignLeft, AlignCenter, AlignRight,
  Undo, Redo, Link, Image, Table, X, ChevronRight, ChevronDown,
  FileUp, Camera, Type, Heading1, Heading2, Heading3, BookOpen, ClipboardList,
  Palette, Highlighter, Minus, Plus as PlusIcon
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import UnderlineExtension from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import TableExtension from '@tiptap/extension-table';
import { toast } from 'sonner';

export default function NotesEditorPage({ user }) {
  const params = useParams();
  const router = useRouter();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState('editor');
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(true);
  const [aiMessage, setAiMessage] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [previewChanges, setPreviewChanges] = useState({ old: '', new: '' });
  const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
  const [creationOption, setCreationOption] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [fontFamily, setFontFamily] = useState('sans');
  const [fontSize, setFontSize] = useState('16');
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#ffff00');
  const [workspace, setWorkspace] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      UnderlineExtension,
      LinkExtension,
      ImageExtension,
      TableExtension,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  useEffect(() => {
    if (params.id) {
      loadNote();
    }
  }, [params.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (content || title) {
        saveNote();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, title]);

  useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  const loadNote = async () => {
    setLoading(true);
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      const response = await fetch(`/api/notes/${params.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNote(data.note);
        setTitle(data.note.title || '');
        setContent(data.note.content || '');
        
        // Load workspace information if note has a workspace
        if (data.note.workspace_id) {
          const workspaceResponse = await fetch(`/api/workspaces/${data.note.workspace_id}`, {
            headers: { Authorization: `Bearer ${session?.access_token}` }
          });
          if (workspaceResponse.ok) {
            const workspaceData = await workspaceResponse.json();
            setWorkspace(workspaceData.workspace);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load note:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveNote = async () => {
    setSaving(true);
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      
      const response = await fetch(`/api/notes/${params.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ title, content }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setNote(data.note);
        toast.success('Note saved successfully');
      }
    } catch (error) {
      console.error('Failed to save note:', error);
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleAIMessage = async () => {
    if (!aiMessage.trim()) return;

    setIsAiThinking(true);
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          message: aiMessage,
          context: {
            noteTitle: title,
            noteContent: content,
            noteId: params.id,
            workspace: workspace ? {
              id: workspace.id,
              title: workspace.title,
              subject: workspace.subject,
              description: workspace.description
            } : null
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiResponse(data.response);
      } else {
        // If AI chat endpoint fails, show a user-friendly message
        setAiResponse('AI chat feature is currently unavailable. Please try again later.');
      }
    } catch (error) {
      console.error('AI chat error:', error);
      setAiResponse('AI chat feature is currently unavailable. Please try again later.');
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleAIAction = async (action) => {
    setIsAiThinking(true);
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();

      // For note generation, use the existing notes API
      if (action === 'generate') {
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            topic: aiMessage.trim(),
            sourceType: 'topic',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate notes');
        }

        const data = await response.json();
        setContent(data.note.content || '');
        setTitle(data.note.title || aiMessage);
        setAiMessage('');
        setIsAiThinking(false);
        return;
      }

      // For other AI actions, try the AI action endpoint
      const response = await fetch('/api/ai/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          action,
          noteTitle: title,
          noteContent: content,
          noteId: params.id
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestedChanges) {
          setPreviewChanges({
            old: content,
            new: data.suggestedChanges
          });
          setShowPreviewPanel(true);
        } else {
          setContent(data.content);
        }
      } else {
        // If AI action endpoint fails, show a user-friendly message
        console.warn('AI action endpoint not available, action skipped');
      }
    } catch (error) {
      console.error('AI action error:', error);
      // Don't throw error, just log it
    } finally {
      setIsAiThinking(false);
    }
  };

  const applyChanges = () => {
    setContent(previewChanges.new);
    setShowPreviewPanel(false);
    saveNote();
    toast.success('Changes applied successfully');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'notes');

      const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadedFile(data);
      }
    } catch (error) {
      console.error('File upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const copyShareLink = () => {
    const link = shareLink || `https://notevoro.app/notes/${params.id}`;
    navigator.clipboard.writeText(link);
    setShareLink(link);
    toast.success('Link copied to clipboard');
  };

  const downloadNote = (format) => {
    const contentToDownload = content.replace(/<[^>]*>/g, '');
    const blob = new Blob([contentToDownload], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'note'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Note downloaded as ${format.toUpperCase()}`);
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex bg-white">
      {/* Left Sidebar - Navigation */}
      <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Notes</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start" onClick={() => router.push('/dashboard/notes')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Notes
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Navigation Bar */}
        <div className="border-b border-gray-200 px-6 py-3 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="hover:text-gray-900 cursor-pointer" onClick={() => router.push('/dashboard/notes')}>Notes</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">{title || 'Untitled Note'}</span>
              </div>
              <span className="text-sm text-gray-400">
                {saving ? 'Saving...' : 'Saved'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsShareModalOpen(true)}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsDownloadModalOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsPrintModalOpen(true)}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsAISidebarOpen(!isAISidebarOpen)}>
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="border-b border-gray-200 px-6 py-2 bg-white">
          <div className="flex items-center gap-1 overflow-x-auto">
            <div className="flex gap-1 mr-4">
              <Button
                variant={activeTab === 'editor' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('editor')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Editor
              </Button>
              <Button
                variant={activeTab === 'flashcards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('flashcards')}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Flashcards
              </Button>
              <Button
                variant={activeTab === 'quiz' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('quiz')}
              >
                <ClipboardList className="h-4 w-4 mr-2" />
                Quiz
              </Button>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            
            {/* Font Family */}
            <select 
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
            >
              <option value="sans">Sans Serif</option>
              <option value="serif">Serif</option>
              <option value="mono">Monospace</option>
            </select>
            
            {/* Font Size */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setFontSize(Math.max(12, parseInt(fontSize) - 2))}>
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-sm w-8 text-center">{fontSize}px</span>
              <Button variant="ghost" size="sm" onClick={() => setFontSize(Math.min(32, parseInt(fontSize) + 2))}>
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="w-px h-6 bg-gray-200" />
            
            {/* Text Color */}
            <div className="relative">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <Palette className="h-4 w-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0" />
            </div>
            
            {/* Highlight Color */}
            <div className="relative">
              <input
                type="color"
                value={highlightColor}
                onChange={(e) => setHighlightColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <Highlighter className="h-4 w-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0" />
            </div>
            
            <div className="w-px h-6 bg-gray-200" />
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleUnderline().run()}><Underline className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Button>
            <div className="w-px h-6 bg-gray-200" />
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></Button>
            <div className="w-px h-6 bg-gray-200" />
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Button>
            <div className="w-px h-6 bg-gray-200" />
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().toggleCodeBlock().run()}><Code className="h-4 w-4" /></Button>
            <div className="w-px h-6 bg-gray-200" />
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().setTextAlign('left').run()}><AlignLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().setTextAlign('center').run()}><AlignCenter className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().setTextAlign('right').run()}><AlignRight className="h-4 w-4" /></Button>
            <div className="w-px h-6 bg-gray-200" />
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().undo().run()}><Undo className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => editor?.chain().focus().redo().run()}><Redo className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-5xl mx-auto px-8 py-8">
            {activeTab === 'editor' && (
              <div className="bg-white rounded-lg shadow-sm p-8 min-h-[600px]">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled Note"
                  className="text-3xl font-bold border-0 focus:ring-0 px-0 mb-6"
                />
                {editor && (
                  <EditorContent 
                    editor={editor} 
                    className="prose prose-lg max-w-none focus:outline-none"
                    style={{ 
                      fontFamily: fontFamily === 'sans' ? 'Inter, sans-serif' : fontFamily === 'serif' ? 'Georgia, serif' : 'monospace',
                      fontSize: `${fontSize}px`,
                      color: textColor
                    }}
                  />
                )}
              </div>
            )}
            {activeTab === 'flashcards' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Flashcards</h2>
                  <Button onClick={() => handleAIAction('flashcards')} size="sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate from Note
                  </Button>
                </div>
                {flashcards.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No flashcards yet. Generate them from your note!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {flashcards.map((card, index) => (
                      <Card key={index} className="p-6">
                        <p className="font-semibold text-gray-900 mb-2">{card.front}</p>
                        <p className="text-gray-600">{card.back}</p>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'quiz' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Quiz</h2>
                  <Button onClick={() => handleAIAction('quiz')} size="sm">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate from Note
                  </Button>
                </div>
                {quizzes.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No quiz yet. Generate it from your note!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quizzes.map((quiz, index) => (
                      <Card key={index} className="p-6">
                        <p className="font-semibold text-gray-900 mb-4">{quiz.question}</p>
                        <div className="space-y-2">
                          {quiz.options.map((option, optIndex) => (
                            <button
                              key={optIndex}
                              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right AI Sidebar */}
      {isAISidebarOpen && (
        <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Assistant
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2 mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Quick Actions
              </p>
              {[
                { icon: FileText, label: 'Summarize Note', action: 'summarize' },
                { icon: MessageSquare, label: 'Explain Difficult Parts', action: 'explain' },
                { icon: FileText, label: 'Simplify Content', action: 'simplify' },
                { icon: FileText, label: 'Expand Content', action: 'expand' },
                { icon: NotebookPen, label: 'Create Flashcards', action: 'flashcards' },
                { icon: FileText, label: 'Create Quiz', action: 'quiz' },
                { icon: FileText, label: 'Find Mistakes', action: 'mistakes' },
                { icon: FileText, label: 'Improve Writing', action: 'improve' },
              ].map((item) => (
                <button
                  key={item.action}
                  onClick={() => handleAIAction(item.action)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm transition-all text-left"
                >
                  <item.icon className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                AI Chat
              </p>
              <Textarea
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                placeholder="Ask AI anything about this note..."
                rows={4}
                className="mb-3"
              />
              <Button onClick={handleAIMessage} disabled={isAiThinking || !aiMessage.trim()} className="w-full">
                {isAiThinking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Send
              </Button>

              {aiResponse && (
                <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-700">{aiResponse}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile AI Sidebar Toggle */}
      <div className="md:hidden fixed bottom-4 right-4 z-20">
        <Button
          onClick={() => setIsAISidebarOpen(!isAISidebarOpen)}
          className="rounded-full shadow-lg"
          size="icon"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile AI Sidebar Modal */}
      {isAISidebarOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50 flex items-end justify-center">
          <div className="bg-white w-full max-h-[80vh] rounded-t-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI Assistant
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsAISidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <div className="space-y-2 mb-6">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Quick Actions
                </p>
                {[
                  { icon: FileText, label: 'Summarize Note', action: 'summarize' },
                  { icon: MessageSquare, label: 'Explain Difficult Parts', action: 'explain' },
                  { icon: FileText, label: 'Simplify Content', action: 'simplify' },
                  { icon: FileText, label: 'Expand Content', action: 'expand' },
                  { icon: NotebookPen, label: 'Create Flashcards', action: 'flashcards' },
                  { icon: FileText, label: 'Create Quiz', action: 'quiz' },
                ].map((item) => (
                  <button
                    key={item.action}
                    onClick={() => handleAIAction(item.action)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all text-left"
                  >
                    <item.icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Ask AI
                </p>
                <div className="space-y-2">
                  <Textarea
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    placeholder="Ask AI to help with your notes..."
                    rows={3}
                    className="text-sm"
                  />
                  <Button
                    onClick={handleAIMessage}
                    disabled={isAiThinking || !aiMessage.trim()}
                    className="w-full"
                  >
                    {isAiThinking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                    {isAiThinking ? 'Thinking...' : 'Send'}
                  </Button>
                </div>
              </div>

              {aiResponse && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700">{aiResponse}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Edit Preview Panel */}
      {showPreviewPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Review AI Suggested Changes</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowPreviewPanel(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-500 mb-2">Original:</p>
                <div className="p-3 bg-red-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                  {previewChanges.old}
                </div>
              </div>
              <div className="flex justify-center">
                <ChevronDown className="h-6 w-6 text-gray-400" />
              </div>
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-500 mb-2">Suggested:</p>
                <div className="p-3 bg-green-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                  {previewChanges.new}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPreviewPanel(false)}>
                Reject
              </Button>
              <Button onClick={applyChanges}>
                Apply Changes
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* New Note Creation Modal */}
      <Dialog open={isNewNoteModalOpen} onOpenChange={setIsNewNoteModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!creationOption ? (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setCreationOption('blank')}
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <FileText className="h-8 w-8 text-purple-500 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Build From Scratch</h3>
                  <p className="text-sm text-gray-500">Start with a blank editor</p>
                </button>
                <button
                  onClick={() => setCreationOption('topic')}
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <Sparkles className="h-8 w-8 text-purple-500 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Enter Topic</h3>
                  <p className="text-sm text-gray-500">AI generates structured notes</p>
                </button>
                <button
                  onClick={() => setCreationOption('file')}
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <FileUp className="h-8 w-8 text-purple-500 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Upload File</h3>
                  <p className="text-sm text-gray-500">PDF, DOCX, PPT, TXT</p>
                </button>
                <button
                  onClick={() => setCreationOption('image')}
                  className="p-6 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                >
                  <Camera className="h-8 w-8 text-purple-500 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Upload Image</h3>
                  <p className="text-sm text-gray-500">OCR text extraction</p>
                </button>
              </div>
            ) : creationOption === 'blank' ? (
              <div className="space-y-4">
                <Button onClick={() => router.push('/dashboard/notes/new')} className="w-full">
                  Open Blank Editor
                </Button>
                <Button variant="outline" onClick={() => setCreationOption(null)} className="w-full">
                  Back
                </Button>
              </div>
            ) : creationOption === 'topic' ? (
              <div className="space-y-4">
                <Input
                  placeholder="Enter a topic..."
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                />
                <Button onClick={() => handleAIAction('generate')} disabled={isGenerating} className="w-full">
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {isGenerating ? 'Generating...' : 'Generate Notes'}
                </Button>
                <Button variant="outline" onClick={() => setCreationOption(null)} className="w-full">
                  Back
                </Button>
              </div>
            ) : creationOption === 'file' || creationOption === 'image' ? (
              <div className="space-y-4">
                <input
                  type="file"
                  accept={creationOption === 'file' ? '.pdf,.docx,.ppt,.txt' : '.jpg,.jpeg,.png'}
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="w-full"
                />
                {isUploading && (
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </p>
                )}
                {uploadedFile && (
                  <Button onClick={() => handleAIAction('extract')} disabled={isGenerating} className="w-full">
                    {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {isGenerating ? 'Processing...' : 'Extract & Create Notes'}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setCreationOption(null)} className="w-full">
                  Back
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Modal */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Print Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">{title || 'Untitled Note'}</h3>
              <p className="text-sm text-gray-500 mb-2">Date: {new Date().toLocaleDateString()}</p>
              <div className="text-sm text-gray-600 line-clamp-3">
                {content.replace(/<[^>]*>/g, '').substring(0, 200)}...
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Download Modal */}
      <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Download Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => downloadNote('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" onClick={() => downloadNote('docx')}>
                <FileText className="h-4 w-4 mr-2" />
                DOCX
              </Button>
              <Button variant="outline" onClick={() => downloadNote('txt')}>
                <FileText className="h-4 w-4 mr-2" />
                TXT
              </Button>
              <Button variant="outline" onClick={() => downloadNote('md')}>
                <FileText className="h-4 w-4 mr-2" />
                Markdown
              </Button>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsDownloadModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Share Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Title:</span>
                <span className="text-sm font-medium text-gray-900">{title || 'Untitled Note'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Owner:</span>
                <span className="text-sm font-medium text-gray-900">{user?.name || 'You'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Last Updated:</span>
                <span className="text-sm font-medium text-gray-900">{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Type:</span>
                <span className="text-sm font-medium text-gray-900">Note</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Shareable Link</label>
              <div className="flex gap-2">
                <Input
                  value={shareLink || `https://notevoro.app/notes/${params.id}`}
                  readOnly
                  className="flex-1"
                />
                <Button onClick={copyShareLink}>
                  Copy
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsShareModalOpen(false)}>
                Close
              </Button>
              <Button onClick={() => window.open(shareLink || `https://notevoro.app/notes/${params.id}`, '_blank')}>
                Open Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
