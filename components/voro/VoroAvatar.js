'use client'
import { Sparkles } from 'lucide-react'

/**
 * Voro Avatar Component
 * Displays the Voro mascot avatar in various sizes
 * Used in chat messages, sidebar, and throughout the app
 */
export function VoroAvatar({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500 ${className}`}>
      <Sparkles className="text-white" size={size === 'sm' ? 12 : size === 'md' ? 16 : size === 'lg' ? 24 : 32} />
    </div>
  )
}

/**
 * Voro Avatar with fox emoji for more personality
 */
export function VoroAvatarFox({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-12 h-12 text-xl',
    xl: 'w-16 h-16 text-2xl',
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500 ${className}`}>
      🦊
    </div>
  )
}
