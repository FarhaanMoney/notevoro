'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import WizardLayout from '@/components/wizard/WizardLayout';
import LocationStep from '@/components/wizard/LocationStep';
import CreationMethodStep from '@/components/wizard/CreationMethodStep';
import ReviewStep from '@/components/wizard/ReviewStep';
import GenerationStep from '@/components/wizard/GenerationStep';
import CompletionStep from '@/components/wizard/CompletionStep';

export default function NotesCreatePage() {
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
        return false; // Auto-advance
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 3) {
      // Start generation
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
      itemCount: Math.floor(Math.random() * 20) + 10,
    });
    setCurrentStep(5);
  };

  const handleOpen = () => {
    // Navigate to the created note
    router.push('/dashboard/notes');
  };

  const handleCreateAnother = () => {
    // Reset wizard state
    setCurrentStep(1);
    setLocation(null);
    setCreationMethod(null);
    setSource(null);
    setGeneratedContent(null);
    setIsGenerating(false);
  };

  const handleReturn = () => {
    router.push('/dashboard/notes');
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
            featureName="Notes"
            location={location}
            creationMethod={creationMethod}
            source={source}
          />
        );
      case 4:
        return (
          <GenerationStep
            featureName="Notes"
            onComplete={handleGenerationComplete}
          />
        );
      case 5:
        return (
          <CompletionStep
            featureName="Notes"
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
    <WizardLayout
      currentStep={currentStep}
      totalSteps={totalSteps}
      onNext={handleNext}
      onBack={handleBack}
      canProceed={canProceed()}
      isLastStep={currentStep === 3}
      featureName="Notes"
    >
      {renderStep()}
    </WizardLayout>
  );
}
