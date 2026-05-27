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
  nodes: [],
  edges: [],
  highlights: [],
  pulses: [],
  focusTarget: null,
  quiz: null,
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
        nodes: [...prev.nodes],
        edges: [...prev.edges],
        highlights: [...prev.highlights],
        pulses: [...prev.pulses],
        focusTarget: prev.focusTarget,
        quiz: prev.quiz,
      };

      switch (action.op) {
        case 'reveal_node': {
          const node = action.node || action.target;
          if (node && node.id) {
            const exists = next.nodes.find((n) => n.id === node.id);
            if (exists) {
              next.nodes = next.nodes.map((n) => (n.id === node.id ? { ...n, ...node, visible: true } : n));
            } else {
              next.nodes.push({ ...node, visible: true, highlighted: false });
            }
          }
          break;
        }
        case 'hide_node': {
          next.nodes = next.nodes.map((n) => (n.id === action.target ? { ...n, visible: false } : n));
          break;
        }
        case 'draw_edge': {
          if (action.from && action.to) {
            const exists = next.edges.find((e) => e.id && action.id ? e.id === action.id : e.from === action.from && e.to === action.to);
            if (!exists) {
              next.edges.push({ id: action.id || `edge-${action.from}-${action.to}-${Date.now()}`, from: action.from, to: action.to, label: action.label || '', animated: Boolean(action.animated) });
            }
          }
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

      if (packet.type === 'step') {
        setSteps((prev) => [...prev, { stepId: packet.stepId || prev.length + 1, narration: packet.narration || '', actions: packet.actions || [] }]);
      }

      if (Array.isArray(packet.actions)) {
        packet.actions.forEach(applyAction);
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
