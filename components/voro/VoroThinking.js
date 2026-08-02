'use client'
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

/**
 * Voro Thinking Animation
 * Subtle animated Voro that replaces generic spinners
 * Features: blinking, subtle movement, sparkles
 */
export function VoroThinking({ size = 'md', className = '' }) {
  const [blink, setBlink] = useState(false)
  const [sparkle, setSparkle] = useState(0)

  useEffect(() => {
    // Blink every 3-4 seconds
    const blinkInterval = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 150)
    }, 3500)

    // Sparkle animation
    const sparkleInterval = setInterval(() => {
      setSparkle((prev) => (prev + 1) % 4)
    }, 800)

    return () => {
      clearInterval(blinkInterval)
      clearInterval(sparkleInterval)
    }
  }, [])

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Main Voro icon */}
      <div className={`w-full h-full rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center transition-transform duration-1000 ${blink ? 'scale-95' : 'scale-100'}`}>
        <Sparkles className="text-white" size={size === 'sm' ? 14 : size === 'md' ? 20 : 28} />
      </div>

      {/* Sparkles around */}
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`absolute w-2 h-2 bg-yellow-300 rounded-full transition-all duration-500 ${
            sparkle === i ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`}
          style={{
            top: `${20 + Math.cos((i * Math.PI) / 2) * 60}%`,
            left: `${20 + Math.sin((i * Math.PI) / 2) * 60}%`,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Voro Thinking with text indicator
 */
export function VoroThinkingWithText({ text = 'Voro is thinking...', size = 'md', className = '' }) {
  return (
    <div className={`flex items-center gap-2 text-muted-foreground text-sm ${className}`}>
      <VoroThinking size={size} />
      <span>{text}</span>
    </div>
  )
}
