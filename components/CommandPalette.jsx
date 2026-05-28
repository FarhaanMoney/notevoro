'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function CommandPalette({ open, onOpenChange, commands }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        onOpenChange(true);
      }
      if (!open) return;
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, filteredCommands.length - 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        filteredCommands[activeIndex]?.action();
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, activeIndex, commands, onOpenChange]);

  const filteredCommands = useMemo(() => {
    const lower = query.toLowerCase();
    return commands
      .filter((command) =>
        command.label.toLowerCase().includes(lower) || command.description?.toLowerCase().includes(lower)
      )
      .slice(0, 8);
  }, [commands, query]);

  const selectCommand = (command) => {
    command.action();
    onOpenChange(false);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#0b1220]/95 p-4 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-3">
          <Search className="h-4 w-4 text-cyan-300" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search commands, worlds, lessons..."
            className="border-none bg-transparent px-0 text-white placeholder:text-slate-500 focus-visible:ring-0"
          />
          <Badge variant="secondary" className="rounded-full px-2 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
            ⌘K
          </Badge>
        </div>

        <div className="mt-4 space-y-2">
          {filteredCommands.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-400">
              No matching command found.
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <button
                key={command.id}
                onClick={() => selectCommand(command)}
                className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                  activeIndex === index ? 'border-cyan-400/60 bg-cyan-500/10 text-white' : 'border-white/10 bg-white/5 text-slate-200 hover:border-cyan-400/30 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{command.label}</p>
                    <p className="mt-1 text-sm text-slate-400">{command.description}</p>
                  </div>
                  {command.shortcut ? <span className="rounded-2xl bg-white/5 px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-300">{command.shortcut}</span> : null}
                </div>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
