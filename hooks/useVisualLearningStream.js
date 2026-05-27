'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

function parseSSEBuffer(buffer) {
  const packets = [];
  let remainder = buffer;

  while (true) {
    const boundary = remainder.indexOf('\n\n');
    if (boundary === -1) break;

    const block = remainder.slice(0, boundary).trim();
    remainder = remainder.slice(boundary + 2);
    if (!block) continue;

    const lines = block.split(/\r?\n/);
    const dataLines = lines.filter((line) => line.trim().startsWith('data:')).map((line) => line.replace(/^data:\s*/, '')).join(' ').trim();
    if (!dataLines) continue;

    try {
      const parsed = JSON.parse(dataLines);
      packets.push(parsed);
    } catch (error) {
      // Ignore a malformed packet and continue parsing later.
    }
  }

  return { packets, remainder };
}

const initialVisualState = {
  lessonType: 'general',
  template: 'default',
  title: 'Ready to learn',
  subtitle: 'Start a live lesson',
  description: 'The AI tutor will choose an immersive visual lesson template.',
  theme: 'cinematic',
  steps: [],
  currentStepIndex: 0,
  currentStep: null,
  visualCues: [],
  moduleData: {},
};

export function useVisualLearningStream() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentNarration, setCurrentNarration] = useState('Type a topic and start the live lesson.');
  const [visualState, setVisualState] = useState(initialVisualState);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortControllerRef = useRef(null);
  const queueRef = useRef([]);
  const runningRef = useRef(false);
  const stalledTimerRef = useRef(null);
  const bufferRef = useRef('');

  const resetStreamState = useCallback(() => {
    setStatus('idle');
    setError(null);
    setSteps([]);
    setCurrentNarration('Type a topic and start the live lesson.');
    setVisualState(initialVisualState);
    queueRef.current = [];
    bufferRef.current = '';
    if (stalledTimerRef.current) {
      clearTimeout(stalledTimerRef.current);
      stalledTimerRef.current = null;
    }
  }, []);

  const applyAction = useCallback((action) => {
    setVisualState((prev) => {
      const next = { ...prev };

      switch (action.op) {
        case 'set_lesson': {
          next.lessonType = action.lessonType || next.lessonType;
          next.template = action.template || next.template;
          next.title = action.title || next.title;
          next.subtitle = action.subtitle || next.subtitle;
          next.description = action.description || next.description;
          next.theme = action.theme || next.theme;
          next.moduleData = { ...next.moduleData, ...action.moduleData };
          break;
        }
        case 'set_scene': {
          next.title = action.title || next.title;
          next.subtitle = action.subtitle || next.subtitle;
          next.description = action.description || next.description;
          next.theme = action.theme || next.theme;
          break;
        }
        case 'add_step': {
          const step = {
            stepId: action.stepId ?? next.steps.length + 1,
            title: action.title || `Step ${next.steps.length + 1}`,
            description: action.description || action.narration || '',
            visualCues: Array.isArray(action.visualCues) ? action.visualCues : [],
            actions: Array.isArray(action.actions) ? action.actions : [],
          };
          next.steps = [...next.steps, step];
          next.currentStepIndex = next.steps.length - 1;
          next.currentStep = step;
          break;
        }
        case 'advance_step': {
          const nextIndex = typeof action.index === 'number' ? action.index : next.steps.length - 1;
          next.currentStepIndex = Math.max(0, Math.min(next.steps.length - 1, nextIndex));
          next.currentStep = next.steps[next.currentStepIndex] || null;
          break;
        }
        case 'add_visual_cue': {
          if (!next.currentStep) break;
          const updated = { ...next.currentStep, visualCues: [...(next.currentStep.visualCues || []), action.cue] };
          next.steps = next.steps.map((step, idx) => (idx === next.currentStepIndex ? updated : step));
          next.currentStep = updated;
          break;
        }
        case 'narration_sync': {
          if (typeof action.text === 'string') {
            setCurrentNarration(action.text);
          }
          break;
        }
        default:
          break;
      }

      return next;
    });
  }, []);

  const handlePacket = useCallback(
    (packet) => {
      if (!packet || typeof packet !== 'object') return;
      if (packet.type === 'error') {
        setError(packet.message || 'AI stream error');
        setStatus('error');
        return;
      }

      if (packet.narration) {
        setCurrentNarration(packet.narration);
      }

      if (packet.lessonType || packet.template || packet.title || packet.subtitle || packet.description) {
        applyAction({
          op: 'set_lesson',
          lessonType: packet.lessonType,
          template: packet.template,
          title: packet.title,
          subtitle: packet.subtitle,
          description: packet.description,
          theme: packet.theme,
          moduleData: packet.moduleData,
        });
      }

      if (packet.type === 'step' || packet.type === 'scene') {
        const step = {
          stepId: packet.stepId || steps.length + 1,
          title: packet.title || `Step ${steps.length + 1}`,
          description: packet.description || packet.narration || '',
          visualCues: Array.isArray(packet.visualCues) ? packet.visualCues : [],
          actions: Array.isArray(packet.actions) ? packet.actions : [],
        };
        setSteps((prev) => {
          const nextSteps = [...prev, step];
          setVisualState((prevState) => ({
            ...prevState,
            steps: nextSteps,
            currentStepIndex: nextSteps.length - 1,
            currentStep: step,
          }));
          return nextSteps;
        });
      }

      if (Array.isArray(packet.actions)) {
        packet.actions.forEach((action) => {
          if (action.op === 'add_step') {
            applyAction(action);
          } else {
            applyAction(action);
          }
        });
      }
    },
    [applyAction, steps.length]
  );

  const processQueue = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const work = () => {
      const packet = queueRef.current.shift();
      if (!packet) {
        runningRef.current = false;
        return;
      }

      handlePacket(packet);
      window.requestAnimationFrame(work);
    };

    window.requestAnimationFrame(work);
  }, [handlePacket]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('cancelled');
    setIsStreaming(false);
    if (stalledTimerRef.current) {
      clearTimeout(stalledTimerRef.current);
      stalledTimerRef.current = null;
    }
  }, []);

  const start = useCallback(
    async (topic, subject = 'general', level = 'intro') => {
      if (!topic || !topic.trim()) {
        setError('Please enter a topic.');
        return;
      }

      cancel();
      resetStreamState();
      setStatus('connecting');
      setIsStreaming(true);
      setError(null);

      const { data: { session } } = await supabaseBrowser().auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('Authentication required');
        setStatus('error');
        setIsStreaming(false);
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/visual-explain/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ topic, subject, level }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const json = await response.json().catch(() => null);
          setError(json?.error || `Unable to start live lesson (${response.status})`);
          setStatus('error');
          setIsStreaming(false);
          return;
        }

        setStatus('streaming');

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Streaming not supported by this browser');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        const readNext = async () => {
          const { done, value } = await reader.read();
          if (done) {
            setStatus((prev) => (prev === 'error' ? prev : 'completed'));
            setIsStreaming(false);
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const { packets, remainder } = parseSSEBuffer(buffer);
          buffer = remainder;

          if (packets.length) {
            packets.forEach((packet) => queueRef.current.push(packet));
            processQueue();
          }

          if (stalledTimerRef.current) {
            clearTimeout(stalledTimerRef.current);
          }
          stalledTimerRef.current = window.setTimeout(() => {
            setError('Live lesson paused. Please try again if it stalls.');
            setStatus('stalled');
            setIsStreaming(false);
          }, 20_000);

          await readNext();
        };

        await readNext();
      } catch (streamError) {
        if (streamError.name === 'AbortError') {
          setStatus('cancelled');
        } else {
          console.error('Visual learning stream failed', streamError);
          setError(streamError.message || 'Streaming failed');
          setStatus('error');
        }
        setIsStreaming(false);
      } finally {
        if (stalledTimerRef.current) {
          clearTimeout(stalledTimerRef.current);
          stalledTimerRef.current = null;
        }
      }
    },
    [cancel, processQueue, resetStreamState]
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  const progress = useMemo(() => Math.min(100, steps.length * 22), [steps.length]);

  return {
    status,
    error,
    steps,
    currentNarration,
    visualState,
    isStreaming,
    progress,
    start,
    cancel,
  };
}
