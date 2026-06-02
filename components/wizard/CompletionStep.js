'use client';

import { CheckCircle, Clock, Folder, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CompletionStep({ featureName, location, creationMethod, generatedContent, onOpen, onCreateAnother, onReturn }) {
  const getCompletionTitle = () => {
    const titles = {
      'notes': 'Notes Created',
      'flashcards': 'Flashcards Ready',
      'quizzes': 'Quiz Created',
      'mock-tests': 'Mock Test Created',
      'study-plans': 'Study Plan Created',
      'visual-learning': 'Visual Learning Generated',
    };
    return titles[featureName.toLowerCase()] || 'Content Created';
  };

  const getEstimatedStudyTime = () => {
    const times = {
      'notes': '15 min',
      'flashcards': '20 min',
      'quizzes': '25 min',
      'mock-tests': '45 min',
      'study-plans': '1 week',
      'visual-learning': '10 min',
    };
    return times[featureName.toLowerCase()] || 'N/A';
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{getCompletionTitle()}</h2>
        <p className="text-gray-500">Your content is ready to use</p>
      </div>

      <div className="space-y-4">
        {/* Resource Type */}
        <Card className="p-6 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Resource Type</p>
                <p className="font-semibold text-gray-900 capitalize">{featureName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Item Count</p>
              <p className="font-semibold text-gray-900">{generatedContent?.itemCount || '1'}</p>
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

        {/* Study Time */}
        <Card className="p-6 border-gray-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Estimated Study Time</p>
              <p className="font-semibold text-gray-900">{getEstimatedStudyTime()}</p>
            </div>
          </div>
        </Card>

        {/* Creation Method */}
        <Card className="p-6 border-gray-200">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Creation Method</p>
              <p className="font-semibold text-gray-900">{creationMethod?.title || 'AI Generated'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button onClick={onOpen} className="flex-1">
          Open Now
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
        <Button onClick={onCreateAnother} variant="outline" className="flex-1">
          Create Another
        </Button>
        <Button onClick={onReturn} variant="outline" className="flex-1">
          Return to Library
        </Button>
      </div>
    </div>
  );
}
