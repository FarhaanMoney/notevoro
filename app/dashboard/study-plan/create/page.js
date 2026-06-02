'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import WizardLayout from '@/components/wizard/WizardLayout';
import LocationStep from '@/components/wizard/LocationStep';
import CreationMethodStep from '@/components/wizard/CreationMethodStep';
import ReviewStep from '@/components/wizard/ReviewStep';
import GenerationStep from '@/components/wizard/GenerationStep';
import CompletionStep from '@/components/wizard/CompletionStep';

export default function StudyPlanCreatePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Wizard state
  const [location, setLocation] = useState(null);
  const [creationMethod, setCreationMethod] = useState(null);
  const [source, setSource] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return location !== null;
      case 2:
        return creationMethod !== null;
      case 3:
        return true;
      case 4:
        return false;
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 3) {
      setIsGenerating(true);
      setCurrentStep(4);
    } else if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerationComplete = () => {
    setIsGenerating(false);
    setGeneratedContent({
      itemCount: Math.floor(Math.random() * 7) + 5,
    });
    setCurrentStep(5);
  };

  const handleOpen = () => {
    router.push('/dashboard/study-plan');
  };

  const handleCreateAnother = () => {
    setCurrentStep(1);
    setLocation(null);
    setCreationMethod(null);
    setSource(null);
    setGeneratedContent(null);
    setIsGenerating(false);
  };

  const handleReturn = () => {
    router.push('/dashboard/study-plan');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <LocationStep
            selectedLocation={location}
            onLocationSelect={setLocation}
          />
        );
      case 2:
        return (
          <CreationMethodStep
            selectedMethod={creationMethod}
            onMethodSelect={setCreationMethod}
          />
        );
      case 3:
        return (
          <ReviewStep
            featureName="Study Plans"
            location={location}
            creationMethod={creationMethod}
            source={source}
          />
        );
      case 4:
        return (
          <GenerationStep
            featureName="Study Plans"
            onComplete={handleGenerationComplete}
          />
        );
      case 5:
        return (
          <CompletionStep
            featureName="Study Plans"
            location={location}
            creationMethod={creationMethod}
            generatedContent={generatedContent}
            onOpen={handleOpen}
            onCreateAnother={handleCreateAnother}
            onReturn={handleReturn}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="w-64 border-r border-gray-200 bg-white flex-shrink-0">
        <div className="p-4">
          <h2 className="font-semibold text-gray-900">Notevoro</h2>
        </div>
      </div>

      <WizardLayout
        currentStep={currentStep}
        totalSteps={totalSteps}
        onNext={handleNext}
        onBack={handleBack}
        canProceed={canProceed()}
        isLastStep={currentStep === 3}
        featureName="Study Plans"
      >
        {renderStep()}
      </WizardLayout>
    </div>
  );
}
