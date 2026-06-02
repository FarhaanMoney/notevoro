'use client';

import { Folder, FileText, Sparkles, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function ReviewStep({ featureName, location, creationMethod, source }) {
  const getMethodLabel = (method) => {
    const labels = {
      'upload-file': 'Upload File',
      'upload-photo': 'Upload Photo',
      'from-existing': 'From Existing Material',
      'enter-topic': 'Enter Topic',
      'from-scratch': 'Start From Scratch',
    };
    return labels[method] || method;
  };

  const getSourceLabel = () => {
    if (creationMethod?.id === 'upload-file' && source?.file) {
      return source.file.name;
    }
    if (creationMethod?.id === 'upload-photo' && source?.file) {
      return source.file.name;
    }
    if (creationMethod?.id === 'enter-topic' && source?.topic) {
      return source.topic;
    }
    if (creationMethod?.id === 'from-existing' && source?.existingItem) {
      return source.existingItem.name;
    }
    if (creationMethod?.id === 'from-scratch') {
      return 'Empty template';
    }
    return 'Not specified';
  };

  const getEstimatedOutput = () => {
    const estimates = {
      'notes': 'Structured notes with headings and summaries',
      'flashcards': 'Question/answer cards with definitions',
      'quizzes': 'Multiple choice questions with explanations',
      'mock-tests': 'Full exam simulation with sections',
      'study-plans': 'Daily schedule with milestones',
      'visual-learning': 'Diagrams and visual explanations',
    };
    return estimates[featureName.toLowerCase()] || 'Content will be generated';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Review your creation</h2>
        <p className="text-gray-500">Confirm the details before generating</p>
      </div>

      <div className="space-y-4">
        {/* Resource Type */}
        <Card className="p-6 border-gray-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Resource Type</p>
              <p className="font-semibold text-gray-900 capitalize">{featureName}</p>
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="p-6 border-gray-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Folder className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Location</p>
              <p className="font-semibold text-gray-900">
                {location?.type === 'studySet' ? location?.studySet?.name : 'Individual'}
              </p>
            </div>
          </div>
        </Card>

        {/* Creation Method */}
        <Card className="p-6 border-gray-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
              <FileText className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Creation Method</p>
              <p className="font-semibold text-gray-900">{getMethodLabel(creationMethod?.id)}</p>
            </div>
          </div>
        </Card>

        {/* Source */}
        <Card className="p-6 border-gray-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Source</p>
              <p className="font-semibold text-gray-900">{getSourceLabel()}</p>
            </div>
          </div>
        </Card>

        {/* Generated Content */}
        <Card className="p-6 border-gray-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Generated Content</p>
              <p className="font-semibold text-gray-900">{getEstimatedOutput()}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
