'use client';

import { useState, useEffect } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function GenerationStep({ featureName, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(0);

  const stages = [
    'Preparing Resources',
    'Reading Material',
    'Analyzing Content',
    'Identifying Key Concepts',
    'Building Structure',
    'Generating Content',
    'Optimizing Output',
    'Saving',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => onComplete(), 500);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    const stageIndex = Math.floor((progress / 100) * stages.length);
    setCurrentStage(stageIndex);
  }, [progress]);

  const getGenerationTitle = () => {
    const titles = {
      'notes': 'Generating Notes...',
      'flashcards': 'Creating Flashcards...',
      'quizzes': 'Generating Quiz...',
      'mock-tests': 'Building Mock Test...',
      'study-plans': 'Creating Study Plan...',
      'visual-learning': 'Generating Visual Learning...',
    };
    return titles[featureName.toLowerCase()] || 'Generating Content...';
  };

  return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="w-full max-w-lg">
        <Card className="p-8 border-gray-200">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-purple-500 animate-pulse" />
              </div>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{getGenerationTitle()}</h2>
              <p className="text-gray-500">AI is working on your content</p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm font-medium text-gray-700">{progress}%</p>
            </div>

            {/* Stages */}
            <div className="space-y-2 text-left">
              {stages.map((stage, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 text-sm ${
                    index < currentStage ? 'text-green-600' : index === currentStage ? 'text-purple-600' : 'text-gray-400'
                  }`}
                >
                  {index < currentStage ? (
                    <Check className="h-4 w-4" />
                  ) : index === currentStage ? (
                    <div className="h-4 w-4 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span>{stage}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
