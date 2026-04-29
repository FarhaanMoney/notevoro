'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { Loader2, BookOpen } from 'lucide-react';

export default function PublicNote({ params }) {
  const [note, setNote] = useState(null);
  const [author, setAuthor] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/public/notes/${params.slug}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) setError(d.error || 'Not found');
        else { setNote(d.note); setAuthor(d.author); }
      })
      .catch(() => setError('Failed to load'));
  }, [params.slug]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <header className="border-b border-white/5 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"><BookOpen className="h-4 w-4 text-white" /></div>
          <span className="font-semibold">Notevoro <span className="text-purple-400">AI</span></span>
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        {!note && !error && <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-purple-400" /></div>}
        {error && <div className="text-center py-20 text-zinc-400">{error}</div>}
        {note && (
          <article>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">{note.title}</h1>
            <div className="text-xs text-zinc-500 mb-8">
              {author?.name && <>Shared by <span className="text-zinc-300">{author.name}</span> · </>}
              {new Date(note.created_at).toLocaleDateString()}
            </div>
            <div className="prose-nv text-[16px] leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                h1: ({node, ...p}) => <h1 className="text-2xl font-bold mt-6 mb-3" {...p} />,
                h2: ({node, ...p}) => <h2 className="text-xl font-semibold mt-5 mb-2" {...p} />,
                h3: ({node, ...p}) => <h3 className="text-lg font-semibold mt-4 mb-2" {...p} />,
                p: ({node, ...p}) => <p className="my-3" {...p} />,
                ul: ({node, ...p}) => <ul className="list-disc pl-6 my-3 space-y-1.5" {...p} />,
                ol: ({node, ...p}) => <ol className="list-decimal pl-6 my-3 space-y-1.5" {...p} />,
                code: ({inline, children, ...p}) => inline
                  ? <code className="px-1.5 py-0.5 rounded bg-white/10 text-purple-300 text-[14px]" {...p}>{children}</code>
                  : <pre className="rounded-lg bg-black/40 border border-white/10 p-4 my-3 overflow-x-auto"><code {...p}>{children}</code></pre>,
                strong: ({node, ...p}) => <strong className="text-white font-semibold" {...p} />,
                blockquote: ({node, ...p}) => <blockquote className="border-l-2 border-purple-500/40 pl-4 my-3 italic text-zinc-300" {...p} />,
                a: ({node, ...p}) => <a className="text-purple-400 hover:underline" target="_blank" rel="noreferrer" {...p} />,
              }}>{note.content}</ReactMarkdown>
            </div>
            <div className="mt-12 pt-6 border-t border-white/10 text-center">
              <p className="text-sm text-zinc-400 mb-3">Like these notes? Create your own with AI.</p>
              <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black hover:bg-zinc-200 text-sm font-medium">Try Notevoro AI</Link>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
