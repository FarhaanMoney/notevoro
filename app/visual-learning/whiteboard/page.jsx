'use client';

import React, { useState } from 'react';
import Shell from '@/components/visual-learning/Shell';
import LeftPanel from '@/components/visual-learning/LeftPanel';
import TemplateRenderer from '@/components/visual-learning/templates/TemplateRenderer';
import { useVisualLearningStream } from '@/hooks/useVisualLearningStream';

export default function WhiteboardPage() {
  const [topic, setTopic] = useState('Explain black holes visually');
  const { status, error, steps, currentNarration, visualState, isStreaming, progress, start, cancel } = useVisualLearningStream();

  return (
    <Shell>
      <LeftPanel
        topic={topic}
        setTopic={setTopic}
        onGenerate={() => start(topic)}
        onCancel={cancel}
        loading={isStreaming}
        steps={steps}
        narration={currentNarration}
        isStreaming={isStreaming}
        status={status}
        progress={progress}
      />
      <div className="flex-1 p-4">
        <TemplateRenderer lessonState={visualState} status={status} error={error} />
      </div>
    </Shell>
  );
}
