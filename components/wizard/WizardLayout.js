'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WizardLayout({
  children,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  canProceed,
  isLastStep,
  featureName,
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      {/* Wizard Header */}
      <div className="border-b border-gray-200 px-8 py-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Create {featureName}</h1>
            <div className="text-sm text-gray-500">
              Step {currentStep} of {totalSteps}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1 rounded-full transition-all ${
                  index < currentStep ? 'bg-purple-500' : index === currentStep - 1 ? 'bg-purple-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Wizard Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </div>

      {/* Wizard Footer */}
      <div className="border-t border-gray-200 px-8 py-6 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <Button
            onClick={onNext}
            disabled={!canProceed}
          >
            {isLastStep ? 'Generate' : 'Continue'}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
