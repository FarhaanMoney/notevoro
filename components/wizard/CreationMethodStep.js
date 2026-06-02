'use client';

import { Upload, Image, FileText, Sparkles, PenTool } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function CreationMethodStep({ selectedMethod, onMethodSelect }) {
  const methods = [
    {
      id: 'upload-file',
      icon: Upload,
      title: 'Upload File',
      description: 'Upload PDF, DOCX, PPTX, TXT, or CSV files',
      example: 'AI extracts content and generates your resource',
      supported: 'PDF, DOCX, PPTX, TXT, CSV'
    },
    {
      id: 'upload-photo',
      icon: Image,
      title: 'Upload Photo',
      description: 'Upload PNG, JPG, JPEG, or WEBP images',
      example: 'AI analyzes images, extracts text, and understands diagrams',
      supported: 'PNG, JPG, JPEG, WEBP'
    },
    {
      id: 'from-existing',
      icon: FileText,
      title: 'Create From Existing Material',
      description: 'Transform your existing Notevoro content',
      example: 'Notes → Flashcards, Quiz → Mock Test, etc.',
      supported: 'Notes, Flashcards, Quizzes, Mock Tests, Study Plans'
    },
    {
      id: 'enter-topic',
      icon: Sparkles,
      title: 'Enter Topic',
      description: 'Let AI generate from a topic name',
      example: 'Photosynthesis, World War II, Machine Learning',
      supported: 'Any topic'
    },
    {
      id: 'from-scratch',
      icon: PenTool,
      title: 'Start From Scratch',
      description: 'Create an empty resource to build manually',
      example: 'Empty editor with full creative control',
      supported: 'Manual creation'
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">How would you like to create this?</h2>
        <p className="text-gray-500">Choose a method to generate your content</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {methods.map((method) => {
          const Icon = method.icon;
          return (
            <Card
              key={method.id}
              className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                selectedMethod?.id === method.id ? 'ring-2 ring-purple-500 border-purple-500' : 'border-gray-200'
              }`}
              onClick={() => onMethodSelect(method)}
            >
              <div className="flex flex-col h-full">
                <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{method.title}</h3>
                <p className="text-sm text-gray-500 mb-3 flex-1">{method.description}</p>
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">{method.example}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
