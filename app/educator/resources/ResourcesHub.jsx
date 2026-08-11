'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { BookOpen, FileText, HelpCircle, Presentation, Search, Layers, Plus, ArrowUpDown, LayoutGrid, List, Star, Share2, FolderPlus, Archive, Trash2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuShortcut, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet'
import { toast } from 'sonner'
import * as resourceRepo from '@/lib/educator/resource-repository'
import { getMockClassroom, mockClassroomList } from '@/lib/educator/mock/classroom-data'
import * as assignmentRepo from '@/lib/educator/assignment-repository'
import { VoroEmptyState } from '@/components/voro/VoroIllustration'
import ResourceActionMenu from './components/ResourceActionMenu'
import ResourceDetailDrawer from './components/ResourceDetailDrawer'
import CreateResourceDialog from './components/CreateResourceDialog'
import ImportResourceDialog from './components/ImportResourceDialog'
import ShareResourceDialog from './components/ShareResourceDialog'
// CollectionPanel removed per declutter request

const TYPE_OPTIONS = [
  { id: 'lesson', label: 'Lesson Plans', icon: BookOpen },
  { id: 'worksheet', label: 'Worksheets', icon: FileText },
  { id: 'quiz', label: 'Quizzes', icon: HelpCircle },
  { id: 'presentation', label: 'Presentations', icon: Presentation },
  { id: 'research', label: 'Research', icon: Search },
  { id: 'notes', label: 'Notes', icon: Layers },
]

const TAB_OPTIONS = [
  { id: 'all', label: 'All Resources' },
  { id: 'mine', label: 'My Resources' },
  { id: 'shared', label: 'Shared With Me' },
  { id: 'archived', label: 'Archived' },
]

const SORT_OPTIONS = [
  { value: 'updated', label: 'Recently Updated' },
  { value: 'created', label: 'Recently Created' },
  { value: 'nameAsc', label: 'Name A–Z' },
  { value: 'nameDesc', label: 'Name Z–A' },
  { value: 'mostUsed', label: 'Most Used' },
  { value: 'leastUsed', label: 'Least Used' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
]

function formatDateLabel(value) {
  const date = new Date(value)
  const diff = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

function mapClassroomName(id) {
  const classroom = mockClassroomList.find((room) => room.id === id)
  return classroom ? classroom.name : 'Unassigned'
}

function filterResources(resources, query, typeFilter, tab, filters) {
  const normalized = query.trim().toLowerCase()

  return resources.filter((resource) => {
    if (tab === 'mine' && resource.owner !== 'You') return false
    if (tab === 'shared') {
      const sharedWith = resource.shared?.withClassrooms?.length || resource.shared?.withEducators?.length || resource.shared?.withStudents
      if (!sharedWith) return false
    }
    if (tab === 'archived' && resource.status !== 'archived') return false
    if (tab !== 'archived' && resource.status === 'archived' && tab !== 'shared') {
      // keep archived only in archived tab
      return tab === 'archived'
    }
    if (typeFilter !== 'all' && resource.type !== typeFilter) return false
    if (filters.status !== 'all' && resource.status !== filters.status) return false
    if (filters.subject !== 'all' && resource.subject !== filters.subject) return false
    if (filters.grade !== 'all' && resource.grade !== filters.grade) return false
    if (filters.classroom !== 'all' && !resource.classroomIds.includes(filters.classroom)) return false
    if (filters.tags.length > 0 && !filters.tags.every((tag) => resource.tags.includes(tag))) return false
    if (filters.collection !== 'all' && filters.collection !== 'favorites') {
      if (!resource.collectionIds.includes(filters.collection)) return false
    }
    if (filters.collection === 'favorites' && !resource.favorite) return false

    if (!normalized) return true
    const hasTitle = resource.title.toLowerCase().includes(normalized)
    const hasSubject = resource.subject.toLowerCase().includes(normalized)
    const hasType = resource.type.toLowerCase().includes(normalized)
    const hasTags = resource.tags.some((tag) => tag.toLowerCase().includes(normalized))
    const hasDescription = resource.description.toLowerCase().includes(normalized)
    return hasTitle || hasSubject || hasType || hasTags || hasDescription
  })
}

function sortResources(resources, sortBy) {
  return [...resources].sort((a, b) => {
    if (sortBy === 'updated') return new Date(b.updatedAt) - new Date(a.updatedAt)
    if (sortBy === 'created') return new Date(b.createdAt) - new Date(a.createdAt)
    if (sortBy === 'nameAsc') return a.title.localeCompare(b.title)
    if (sortBy === 'nameDesc') return b.title.localeCompare(a.title)
    if (sortBy === 'mostUsed') return (b.assignmentIds.length + b.classroomIds.length) - (a.assignmentIds.length + a.classroomIds.length)
    if (sortBy === 'leastUsed') return (a.assignmentIds.length + a.classroomIds.length) - (b.assignmentIds.length + b.classroomIds.length)
    return 0
  })
}

function buildTypeSummary(resources) {
  return TYPE_OPTIONS.map((type) => ({
    ...type,
    count: resources.filter((resource) => resource.type === type.id).length,
  }))
}

function availableTags(resources) {
  return [...new Set(resources.flatMap((resource) => resource.tags))].sort()
}

export default function ResourcesHub() {
  const searchInput = useRef(null)
  const [resources, setResources] = useState([])
  const [collections, setCollections] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState('all')
  const [activeTab, setActiveTab] = useState('all')
  const [filters, setFilters] = useState({ subject: 'all', grade: 'all', classroom: 'all', status: 'all', tags: [], collection: 'all' })
  const [sortBy, setSortBy] = useState('updated')
  const [viewMode, setViewMode] = useState('list')
  const [selectedIds, setSelectedIds] = useState([])
  const [detailResource, setDetailResource] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [activeShareResource, setActiveShareResource] = useState(null)
  const [showCollection, setShowCollection] = useState(false)
  const [classrooms, setClassrooms] = useState([])

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const [resourceList, collectionList, assignmentList] = await Promise.all([
          resourceRepo.getResources(),
          resourceRepo.getCollections(),
          assignmentRepo.getAssignments(),
        ])
        if (!mounted) return
        setResources(resourceList)
        setCollections(collectionList)
        setAssignments(assignmentList)
        setClassrooms(mockClassroomList)
      } catch (err) {
        console.error(err)
        if (!mounted) return
        setError('Unable to load your resources. Try again in a moment.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInput.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const filteredResources = useMemo(() => {
    const filtered = filterResources(resources, query, activeType, activeTab, filters)
    return sortResources(filtered, sortBy)
  }, [resources, query, activeType, activeTab, filters, sortBy])

  const typeCounts = useMemo(() => buildTypeSummary(resources), [resources])
  const tagOptions = useMemo(() => availableTags(resources), [resources])
  const allSelected = selectedIds.length === filteredResources.length && filteredResources.length > 0

  const toggleSelect = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : filteredResources.map((resource) => resource.id))
  const closeDetail = () => setDetailResource(null)

  const updateResource = async (id, updates) => {
    const updated = await resourceRepo.updateResource(id, updates)
    setResources((current) => current.map((resource) => resource.id === id ? updated : resource))
    return updated
  }

  const handleArchive = async (resource) => {
    await updateResource(resource.id, { status: 'archived' })
    toast.success(`Archived ${resource.title}`)
    setSelectedIds((current) => current.filter((uid) => uid !== resource.id))
  }

  const handleDuplicate = async (resource) => {
    const copy = await resourceRepo.duplicateResource(resource.id)
    setResources((current) => [copy, ...current])
    toast.success(`Duplicated ${resource.title}`)
  }

  const handleFavorite = async (resource) => {
    const updated = await resourceRepo.toggleFavorite(resource.id)
    setResources((current) => current.map((item) => item.id === updated.id ? updated : item))
  }

  const handleDelete = async (resourceId) => {
    await resourceRepo.deleteResource(resourceId)
    setResources((current) => current.filter((item) => item.id !== resourceId))
    setSelectedIds((current) => current.filter((item) => item !== resourceId))
    toast.success('Resource deleted')
  }

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) return
    if (action === 'archive') {
      await Promise.all(selectedIds.map((id) => resourceRepo.archiveResource(id)))
      setResources((current) => current.map((resource) => selectedIds.includes(resource.id) ? { ...resource, status: 'archived', updatedAt: new Date().toISOString() } : resource))
      toast.success(`${selectedIds.length} resources archived`)
    }
    if (action === 'delete') {
      await Promise.all(selectedIds.map((id) => resourceRepo.deleteResource(id)))
      setResources((current) => current.filter((resource) => !selectedIds.includes(resource.id)))
      toast.success(`${selectedIds.length} resources deleted`)
    }
    if (action === 'share') {
      toast.success('Bulk share action is ready for classroom or educator sharing.')
    }
    if (action === 'move') {
      toast.success('Bulk move action saved to future collection support.')
    }
    setSelectedIds([])
  }

  const handleAddCollection = async (name) => {
    const collection = await resourceRepo.createCollection({ name })
    setCollections((current) => [collection, ...current])
    toast.success(`Created collection ${name}`)
  }

  const handleCreateResource = async (resourceData) => {
    const created = await resourceRepo.createResource(resourceData)
    setResources((current) => [created, ...current])
    setShowCreate(false)
    toast.success(`${created.title} created`)
  }

  const handleShareResource = async (resourceId, payload) => {
    const updated = await resourceRepo.shareResource(resourceId, payload)
    setResources((current) => current.map((item) => item.id === updated.id ? updated : item))
    toast.success('Resource sharing simulated successfully')
  }

  const handleAddToClassroom = async (resourceId, classroomId) => {
    const updated = await resourceRepo.addToClassroom(resourceId, classroomId)
    setResources((current) => current.map((item) => item.id === updated.id ? updated : item))
    toast.success('Added to classroom')
  }

  const handleAddToAssignment = async (resourceId, assignmentId) => {
    const updated = await resourceRepo.addToAssignment(resourceId, assignmentId)
    setResources((current) => current.map((item) => item.id === updated.id ? updated : item))
    toast.success('Added to assignment')
  }

  const isEmpty = !loading && filteredResources.length === 0

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-8">
        <div className="space-y-2">
          <div className="text-sm uppercase tracking-[0.24em] text-primary">Resources</div>
          <h1 className="text-4xl font-semibold tracking-tight">Create, organize, and reuse your teaching materials.</h1>
          <p className="max-w-2xl text-muted-foreground">Build a teaching library, share with classrooms, and connect resources to assignments in one polished hub.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={() => setShowImport(true)} className="min-w-[150px]">
            <FolderPlus className="h-4 w-4" /> Import
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-gradient-to-r from-violet-500 to-pink-500 min-w-[210px]">
                <Plus className="h-4 w-4" /> Create Resource
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Quick create</DropdownMenuLabel>
              {TYPE_OPTIONS.map((option) => (
                <DropdownMenuItem key={option.id} onSelect={() => {
                  setShowCreate(true)
                  setActiveType(option.id)
                }}>
                  {option.label}
                  <DropdownMenuShortcut>{option.id}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onSelect={() => { setShowCreate(true); setActiveType('ai') }}>
                Resource from AI
                <DropdownMenuShortcut>Voro</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setShowCreate(true); setActiveType('upload') }}>
                Upload File
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto] items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInput}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search resources by title, topic, or tag…"
                className="pl-11 pr-28"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">⌘ K</span>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <Badge className="bg-muted text-muted-foreground">{filteredResources.length} results</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <ArrowUpDown className="h-4 w-4" /> Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuItem key={option.value} onSelect={() => setSortBy(option.value)}>
                      {option.label}
                      {sortBy === option.value ? <Star className="ml-auto h-4 w-4 text-primary" /> : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {typeCounts.map((type) => {
              const active = activeType === type.id
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setActiveType(active ? 'all' : type.id)}
                  className={`group flex items-start gap-4 rounded-3xl border px-5 py-5 text-left transition ${active ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-card/80 hover:border-primary/40 hover:bg-card/70'}`}
                >
                  <span className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-sm ${active ? 'ring-2 ring-primary' : ''}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{type.label}</div>
                    <div className="text-sm text-muted-foreground">{type.count} resources</div>
                  </div>
                </button>
              )
            })}
          </div>

          <Card className="overflow-hidden bg-card/70">
            <div className="border-b border-border px-6 py-5 bg-background/80">
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  {TAB_OPTIONS.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div className="grid gap-4 px-6 py-5 lg:grid-cols-[1fr,1fr]">
              <div className="space-y-4">
                <div className="text-sm font-semibold">Filters</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select value={filters.subject} onValueChange={(value) => setFilters((current) => ({ ...current, subject: value }))}>
                    <SelectTrigger>
                      <SelectValue>{filters.subject === 'all' ? 'All Subjects' : filters.subject}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subjects</SelectItem>
                      <SelectItem value="Biology">Biology</SelectItem>
                      <SelectItem value="Mathematics">Mathematics</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Physics">Physics</SelectItem>
                      <SelectItem value="Chemistry">Chemistry</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.grade} onValueChange={(value) => setFilters((current) => ({ ...current, grade: value }))}>
                    <SelectTrigger>
                      <SelectValue>{filters.grade === 'all' ? 'All Grades' : `Grade ${filters.grade}`}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      {['6','7','8','9','10','11','12'].map((grade) => (
                        <SelectItem key={grade} value={grade}>Grade {grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.classroom} onValueChange={(value) => setFilters((current) => ({ ...current, classroom: value }))}>
                    <SelectTrigger>
                      <SelectValue>{filters.classroom === 'all' ? 'All Classrooms' : mapClassroomName(filters.classroom)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classrooms</SelectItem>
                      {classrooms.map((classroom) => (
                        <SelectItem key={classroom.id} value={classroom.id}>{classroom.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.status} onValueChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
                    <SelectTrigger>
                      <SelectValue>{filters.status === 'all' ? 'All Statuses' : filters.status}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Tags removed to declutter UI per request */}
                {/* Collections select retained for filtering but My Collections card removed */}
              </div>
            </div>
          </Card>

          {/* Resource activity removed to declutter UI per request */}
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8">
          <Card className="rounded-3xl border border-border bg-card/70 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Resource status</p>
                <h2 className="text-lg font-semibold">Status summary</h2>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
                <div>
                  <div className="text-sm font-medium">Active</div>
                  <div className="text-xs text-muted-foreground">Ready to assign or reuse</div>
                </div>
                <div className="text-lg font-semibold">{resources.filter((resource) => resource.status === 'active').length}</div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
                <div>
                  <div className="text-sm font-medium">Drafts</div>
                  <div className="text-xs text-muted-foreground">Work in progress</div>
                </div>
                <div className="text-lg font-semibold">{resources.filter((resource) => resource.status === 'draft').length}</div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
                <div>
                  <div className="text-sm font-medium">Archived</div>
                  <div className="text-xs text-muted-foreground">Can be restored later</div>
                </div>
                <div className="text-lg font-semibold">{resources.filter((resource) => resource.status === 'archived').length}</div>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <div className="mt-6 rounded-3xl border border-border bg-card/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-2xl px-4 py-2 text-sm transition ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            >
              <List className="mr-2 inline-block h-4 w-4" /> List View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-2xl px-4 py-2 text-sm transition ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            >
              <LayoutGrid className="mr-2 inline-block h-4 w-4" /> Grid View
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Star className="h-4 w-4 text-amber-400" /> Favorited resources are available in Collections.
          </div>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
              <Card key={index} className="h-28 animate-pulse bg-card/60" />
            ))}
          </div>
        ) : error ? (
          <Card className="rounded-3xl border border-border bg-card/70 p-10 text-center">
            <div className="space-y-4">
              <p className="text-lg font-semibold">Something went wrong</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </Card>
        ) : isEmpty ? (
          <VoroEmptyState
            type="default"
            title={activeTab === 'archived' ? 'No archived resources yet' : 'No resources found'}
            description={activeTab === 'archived' ? 'Archive resources from the library to review them later.' : 'Try another search, clear filters, or create a new resource.'}
            action={<Button className="bg-gradient-to-r from-violet-500 to-pink-500" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />Create Resource
            </Button>}
            className="bg-card/40 border-dashed"
          />
        ) : viewMode === 'list' ? (
          <div className="overflow-hidden rounded-3xl border border-border">
            <div className="grid grid-cols-[48px_minmax(220px,2fr)_140px_140px_140px_120px_80px] gap-4 border-b border-border bg-background px-5 py-4 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              <div className="flex items-center justify-center">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
              </div>
              <div>Name</div>
              <div>Type</div>
              <div>Subject</div>
              <div>Used In</div>
              <div>Updated</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-border">
              {filteredResources.map((resource) => (
                <div key={resource.id} className="grid grid-cols-[48px_minmax(220px,2fr)_140px_140px_140px_120px_80px] items-center gap-4 px-5 py-4 hover:bg-muted/40 transition">
                  <div className="flex items-center justify-center">
                    <Checkbox checked={selectedIds.includes(resource.id)} onCheckedChange={() => toggleSelect(resource.id)} />
                  </div>
                  <button type="button" className="text-left" onClick={() => setDetailResource(resource)}>
                    <div className="font-semibold text-foreground">{resource.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">{resource.description}</div>
                  </button>
                  <div>{TYPE_OPTIONS.find((item) => item.id === resource.type)?.label || 'Resource'}</div>
                  <div>{resource.subject}</div>
                  <div>
                    <div className="text-sm font-medium">{resource.classroomIds.length ? mapClassroomName(resource.classroomIds[0]) : 'Personal'}</div>
                    <div className="text-xs text-muted-foreground">{resource.assignmentIds.length} Assignments</div>
                  </div>
                  <div>{formatDateLabel(resource.updatedAt)}</div>
                  <div className="flex justify-end">
                    <ResourceActionMenu
                      resource={resource}
                      onOpen={() => setDetailResource(resource)}
                      onDuplicate={() => handleDuplicate(resource)}
                      onArchive={() => handleArchive(resource)}
                      onDelete={() => handleDelete(resource.id)}
                      onFavorite={() => handleFavorite(resource)}
                      onShare={() => { setActiveShareResource(resource); setShowShare(true) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredResources.map((resource) => (
              <Card key={resource.id} className="group relative overflow-hidden border border-border bg-card/70 p-5 transition hover:border-primary/50 hover:shadow-lg">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 opacity-90" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{TYPE_OPTIONS.find((item) => item.id === resource.type)?.label}</div>
                    <h3 className="mt-2 text-xl font-semibold leading-tight">{resource.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{resource.description}</p>
                  </div>
                  <button type="button" onClick={() => toggleSelect(resource.id)} className="rounded-full border border-border bg-background p-2 text-muted-foreground transition hover:border-primary hover:text-primary">
                    <Checkbox checked={selectedIds.includes(resource.id)} className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border px-2 py-1">{resource.subject}</span>
                  <span className="rounded-full border border-border px-2 py-1">Grade {resource.grade}</span>
                  {resource.favorite && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-300">★ Favorite</span>}
                </div>
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                  <div>{resource.classroomIds.length ? `${mapClassroomName(resource.classroomIds[0])}` : 'Personal resource'}</div>
                  <div>{resource.assignmentIds.length} assignment{resource.assignmentIds.length === 1 ? '' : 's'}</div>
                  <div>Updated {formatDateLabel(resource.updatedAt)}</div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Button variant="outline" size="sm" onClick={() => setDetailResource(resource)}>Open</Button>
                  <ResourceActionMenu
                    resource={resource}
                    small
                    onOpen={() => setDetailResource(resource)}
                    onDuplicate={() => handleDuplicate(resource)}
                    onArchive={() => handleArchive(resource)}
                    onDelete={() => handleDelete(resource.id)}
                    onFavorite={() => handleFavorite(resource)}
                    onShare={() => { setActiveShareResource(resource); setShowShare(true) }}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ResourceDetailDrawer
        open={Boolean(detailResource)}
        resource={detailResource}
        onClose={closeDetail}
        classrooms={classrooms}
        assignments={assignments}
        collections={collections}
        onDuplicate={handleDuplicate}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onFavorite={handleFavorite}
        onAddToClassroom={handleAddToClassroom}
        onAddToAssignment={handleAddToAssignment}
        onShare={(payload) => activeShareResource ? handleShareResource(activeShareResource.id, payload) : null}
        onOpenShare={(resource) => { setActiveShareResource(resource); setShowShare(true) }}
      />

      <CreateResourceDialog
        open={showCreate}
        defaultType={activeType}
        collections={collections}
        classrooms={classrooms}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreateResource}
      />

      <ImportResourceDialog open={showImport} onClose={() => setShowImport(false)} />

      <ShareResourceDialog
        open={showShare}
        resource={activeShareResource}
        onClose={() => setShowShare(false)}
        onShare={handleShareResource}
      />

      <Dialog open={showCollection} onOpenChange={setShowCollection}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create a collection</DialogTitle>
            <DialogDescription>Save a new collection for organizing your teaching resources.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input placeholder="Collection name" id="collection-name" />
            <Input placeholder="Description" id="collection-description" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCollection(false)}>Cancel</Button>
            <Button onClick={() => {
              const nameInput = document.getElementById('collection-name')
              if (nameInput?.value) {
                handleAddCollection(nameInput.value)
                setShowCollection(false)
              }
            }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
