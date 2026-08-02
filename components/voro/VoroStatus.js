'use client'
import { useState, useEffect } from 'react'
import { VoroThinking } from './VoroThinking'

/**
 * Voro Status Messages
 * Context-aware status messages for AI operations
 */

const STATUS_MESSAGES = {
  research: [
    'Voro is searching trusted sources...',
    'Voro is reading articles...',
    'Voro is comparing information...',
    'Voro is writing your report...',
  ],
  presentation: [
    'Voro is designing your presentation...',
    'Voro is finding visuals...',
    'Voro is creating diagrams...',
    'Voro is writing speaker notes...',
  ],
  notes: [
    'Voro is organizing your notes...',
    'Voro is simplifying your content...',
    'Voro is creating summaries...',
  ],
  flashcards: [
    'Voro is creating flashcards...',
  ],
  quiz: [
    'Voro is building your quiz...',
  ],
  test: [
    'Voro is preparing your practice test...',
  ],
  study_pack: [
    'Voro is gathering information...',
    'Voro is creating notes...',
    'Voro is generating flashcards...',
    'Voro is building your quiz...',
  ],
  default: [
    'Voro is thinking...',
    'Voro is working on it...',
  ],
}

export function VoroStatus({ type = 'default', className = '' }) {
  const [messageIndex, setMessageIndex] = useState(0)
  const messages = STATUS_MESSAGES[type] || STATUS_MESSAGES.default

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2500)

    return () => clearInterval(interval)
  }, [messages.length])

  return (
    <div className={`flex items-center gap-3 text-muted-foreground text-sm ${className}`}>
      <VoroThinking size="md" />
      <span>{messages[messageIndex]}</span>
    </div>
  )
}
