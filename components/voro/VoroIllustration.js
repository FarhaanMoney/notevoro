'use client'
import { BookOpen, Presentation, Search, Layers, Folder, Calendar, LayoutDashboard } from 'lucide-react'

/**
 * Voro Illustrations for different contexts
 * Used in empty states, loading screens, and feature pages
 */

export function VoroIllustration({ type = 'default', size = 'lg', className = '' }) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
  }

  const illustrations = {
    default: (
      <div className={`${sizeClasses[size]} rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-primary/30 flex items-center justify-center`}>
        <div className="text-6xl">🦊</div>
      </div>
    ),
    notes: (
      <div className={`${sizeClasses[size]} rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-primary/30 flex items-center justify-center relative`}>
        <div className="text-5xl">🦊</div>
        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-background rounded-lg border border-border flex items-center justify-center shadow-lg">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
      </div>
    ),
    presentations: (
      <div className={`${sizeClasses[size]} rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-primary/30 flex items-center justify-center relative`}>
        <div className="text-5xl">🦊</div>
        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-background rounded-lg border border-border flex items-center justify-center shadow-lg">
          <Presentation className="w-6 h-6 text-primary" />
        </div>
      </div>
    ),
    research: (
      <div className={`${sizeClasses[size]} rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-primary/30 flex items-center justify-center relative`}>
        <div className="text-5xl">🦊</div>
        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-background rounded-lg border border-border flex items-center justify-center shadow-lg">
          <Search className="w-6 h-6 text-primary" />
        </div>
      </div>
    ),
    flashcards: (
      <div className={`${sizeClasses[size]} rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-primary/30 flex items-center justify-center relative`}>
        <div className="text-5xl">🦊</div>
        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-background rounded-lg border border-border flex items-center justify-center shadow-lg">
          <Layers className="w-6 h-6 text-primary" />
        </div>
      </div>
    ),
    folders: (
      <div className={`${sizeClasses[size]} rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-primary/30 flex items-center justify-center relative`}>
        <div className="text-5xl">🦊</div>
        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-background rounded-lg border border-border flex items-center justify-center shadow-lg">
          <Folder className="w-6 h-6 text-primary" />
        </div>
      </div>
    ),
    calendar: (
      <div className={`${sizeClasses[size]} rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-primary/30 flex items-center justify-center relative`}>
        <div className="text-5xl">🦊</div>
        <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-background rounded-lg border border-border flex items-center justify-center shadow-lg">
          <Calendar className="w-6 h-6 text-primary" />
        </div>
      </div>
    ),
    dashboard: (
      <div className={`${sizeClasses[size]} rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-primary/30 flex items-center justify-center`}>
        <div className="text-6xl animate-bounce">🦊</div>
      </div>
    ),
  }

  return illustrations[type] || illustrations.default
}

/**
 * Empty State Component with Voro
 */
export function VoroEmptyState({ type = 'default', title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <VoroIllustration type={type} size="xl" className="mb-6" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      {action}
    </div>
  )
}
