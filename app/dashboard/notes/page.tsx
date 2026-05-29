"use client";
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Download, Share2, Trash2, Edit2, Sparkles, FolderOpen } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  createdAt: Date;
  isAiGenerated: boolean;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      title: 'Photosynthesis: Complete Overview',
      content: 'Photosynthesis is the process by which plants convert light energy into chemical energy. It occurs in two main stages: light-dependent reactions and the Calvin cycle.',
      folder: 'Biology',
      createdAt: new Date(),
      isAiGenerated: true,
    },
    {
      id: '2',
      title: 'Spanish Verb Conjugation',
      content: 'Regular verbs in Spanish follow predictable patterns. First conjugation (-ar verbs), second conjugation (-er verbs), and third conjugation (-ir verbs).',
      folder: 'Languages',
      createdAt: new Date(),
      isAiGenerated: true,
    },
  ]);

  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0]);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(selectedNote?.content || '');

  const handleNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'Untitled Note',
      content: '',
      folder: 'General',
      createdAt: new Date(),
      isAiGenerated: false,
    };
    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    setEditing(true);
  };

  const folders = ['All', 'Biology', 'Languages', 'History', 'Physics'];

  return (
    <div className="min-h-screen w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-screen overflow-hidden px-6 md:px-12 py-8">
          {/* Left Sidebar - Notes List */}
          <div className="lg:col-span-1 flex flex-col gap-4 overflow-hidden">
            {/* New Note Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNewNote}
              className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-3 font-semibold text-slate-950 shadow-[0_20px_80px_rgba(59,130,246,0.25)] transition hover:brightness-110 flex items-center justify-center gap-2 w-full"
            >
              <Plus className="h-5 w-5" />
              New Note
            </motion.button>

            {/* Folder Tabs */}
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Folders</p>
              <div className="flex gap-2 overflow-x-auto">
                {folders.map((folder) => (
                  <button
                    key={folder}
                    className="whitespace-nowrap rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold transition hover:bg-white/10 text-white"
                  >
                    {folder}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {notes.map((note) => (
                <motion.button
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  whileHover={{ scale: 1.02 }}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    selectedNote?.id === note.id
                      ? 'border-cyan-400/40 bg-cyan-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {note.isAiGenerated && (
                      <Sparkles className="h-4 w-4 text-cyan-300 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white text-sm truncate">{note.title}</p>
                      <p className="text-xs text-zinc-400 truncate">{note.folder}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          {selectedNote && (
            <motion.div
              key={selectedNote.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-3 flex flex-col gap-4 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex-1">
                  {editing ? (
                    <input
                      type="text"
                      value={selectedNote.title}
                      onChange={(e) =>
                        setSelectedNote({ ...selectedNote, title: e.target.value })
                      }
                      className="w-full bg-transparent text-2xl font-bold text-white outline-none mb-2"
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-white">{selectedNote.title}</h1>
                  )}
                  <p className="text-xs text-zinc-400">
                    {selectedNote.isAiGenerated && '✨ AI Generated • '}
                    {selectedNote.folder} • Updated today
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {editing ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setEditing(false)}
                      className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Save
                    </motion.button>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() => setEditing(true)}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
                      >
                        <Edit2 className="h-5 w-5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
                      >
                        <Share2 className="h-5 w-5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 transition hover:bg-white/10"
                      >
                        <Download className="h-5 w-5" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 transition hover:bg-rose-500/20"
                      >
                        <Trash2 className="h-5 w-5 text-rose-400" />
                      </motion.button>
                    </>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-6">
                {editing ? (
                  <textarea
                    value={selectedNote.content}
                    onChange={(e) =>
                      setSelectedNote({ ...selectedNote, content: e.target.value })
                    }
                    className="w-full h-full bg-transparent text-white text-base leading-relaxed outline-none resize-none"
                    placeholder="Start typing..."
                  />
                ) : (
                  <div className="text-white text-base leading-relaxed whitespace-pre-wrap">
                    {selectedNote.content}
                  </div>
                )}
              </div>

              {/* AI Actions */}
              {!editing && (
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="flex-1 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 font-semibold text-cyan-200 transition hover:bg-cyan-500/20 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-5 w-5" />
                    Summarize
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="flex-1 rounded-lg border border-violet-400/30 bg-violet-500/10 px-4 py-3 font-semibold text-violet-200 transition hover:bg-violet-500/20"
                  >
                    Generate Quiz
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
                  >
                    Create Flashcards
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
  );
}
