'use client'

import { MoreVertical, Star, Copy, FolderPlus, Archive, Trash2, Share2, Layers, PlusSquare, BookOpen, FileText, HelpCircle, Presentation, Search } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const resourceIcons = {
  lesson: BookOpen,
  worksheet: FileText,
  quiz: HelpCircle,
  presentation: Presentation,
  research: Search,
  notes: Layers,
}

export default function ResourceActionMenu({ resource, small = false, onOpen, onDuplicate, onArchive, onDelete, onFavorite, onShare }) {
  const Icon = resourceIcons[resource?.type] || Layers
  const isFavorite = resource?.favorite

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={small ? 'icon' : 'sm'} className={small ? 'h-9 w-9 p-0 rounded-full' : ''}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onOpen}>Open</DropdownMenuItem>
        <DropdownMenuItem onSelect={onFavorite}>{isFavorite ? 'Unfavorite' : 'Favorite'}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicate}>Duplicate</DropdownMenuItem>
        <DropdownMenuItem onSelect={onShare}>Share</DropdownMenuItem>
        <DropdownMenuItem onSelect={onArchive}>{resource?.status === 'archived' ? 'Restore' : 'Archive'}</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDelete} className="text-destructive">Delete</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onOpen && onOpen()}>
          <Icon className="h-4 w-4" />
          View details
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
