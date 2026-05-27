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
  scene: {
    id: 'intro',
    title: 'Ready to learn',
    subtitle: 'Start a live lesson',
    description: 'The AI tutor will animate concepts step by step.',
  },
  objects: [],
  effects: [],
  highlights: [],
  pulses: [],
  focusTarget: null,
  quiz: null,
  camera: { zoom: 1, x: 0, y: 0 },
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
      const next = {
        scene: { ...prev.scene },
        objects: [...prev.objects],
        effects: [...prev.effects],
        highlights: [...prev.highlights],
        pulses: [...prev.pulses],
        focusTarget: prev.focusTarget,
        quiz: prev.quiz,
        camera: { ...prev.camera },
      };

      switch (action.op) {
        case 'set_scene': {
          next.scene = {
            ...next.scene,
            title: action.title || next.scene.title,
            subtitle: action.subtitle || next.scene.subtitle,
            description: action.description || next.scene.description,
          };
          break;
        }
        case 'reveal_object': {
          const obj = action.object || action.target;
          if (obj && obj.id) {
            const existing = next.objects.find((item) => item.id === obj.id);
            if (existing) {
              next.objects = next.objects.map((item) => (item.id === obj.id ? { ...item, ...obj, visible: true } : item));
            } else {
              next.objects.push({ ...obj, visible: true });
            }
          }
          break;
        }
        case 'hide_object': {
          next.objects = next.objects.map((item) => (item.id === action.target ? { ...item, visible: false } : item));
          break;
        }
        case 'draw_path': {
          const path = {
            id: action.id || `path-${action.from}-${action.to}-${Date.now()}`,
            type: 'path',
            from: action.from,
            to: action.to,
            shape: action.shape || 'line',
            label: action.label || '',
            animated: Boolean(action.animated),
            visible: true,
          };
          const exists = next.effects.find((item) => item.id === path.id);
          if (exists) {
            next.effects = next.effects.map((item) => (item.id === path.id ? { ...item, ...path } : item));
          } else {
            next.effects.push(path);
          }
          break;
        }
        case 'particle_effect': {
          const effect = {
            id: action.id || `particle-${Date.now()}`,
            type: action.type || 'particles',
            x: action.x || 0,
            y: action.y || 0,
            count: action.count || 16,
            color: action.color || '#7c3aed',
            visible: true,
          };
          next.effects.push(effect);
          break;
        }
        case 'highlight': {
          if (action.target) {
            next.highlights = [action.target];
          }
          break;
        }
        case 'pulse': {
          if (action.target) {
            next.pulses = [...new Set([...next.pulses, action.target])];
            const duration = typeof action.durationMs === 'number' ? action.durationMs : 900;
            setTimeout(() => {
              setVisualState((state) => ({
                ...state,
                pulses: state.pulses.filter((id) => id !== action.target),
              }));
            }, duration);
          }
          break;
        }
        case 'zoom_focus': {
          next.focusTarget = action.target || null;
          break;
        }
        case 'show_label': {
          next.objects = next.objects.map((obj) => (obj.id === action.target ? { ...obj, label: action.text || obj.label } : obj));
          break;
        }
        case 'animate_object': {
          next.objects = next.objects.map((obj) => (obj.id === action.target ? { ...obj, animation: action.animation || obj.animation } : obj));
          break;
        }
        case 'quiz_popup': {
          next.quiz = {
            visible: true,
            question: action.question || 'Review this concept',
            choices: Array.isArray(action.choices) ? action.choices : [],
            correctIndex: typeof action.correctIndex === 'number' ? action.correctIndex : 0,
          };
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

      if (packet.type === 'step' || packet.type === 'scene') {
        setSteps((prev) => [...prev, { stepId: packet.stepId || prev.length + 1, narration: packet.narration || '', actions: packet.actions || [], scene: packet.scene || null }]);
      }

      if (Array.isArray(packet.actions)) {
        packet.actions.forEach(applyAction);
      }

      if (packet.scene && packet.type !== 'scene') {
        if (Array.isArray(packet.scene)) {
          packet.scene.forEach((action) => applyAction(action));
        } else if (typeof packet.scene === 'object') {
          applyAction({ op: 'set_scene', ...packet.scene });
        }
      }
    },
    [applyAction]
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
