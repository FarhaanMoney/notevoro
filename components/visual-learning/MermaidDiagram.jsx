'use client';

import { useEffect, useId, useState } from 'react';

export default function MermaidDiagram({ chart, caption }) {
  const reactId = useId();
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chart) return;
    let cancelled = false;

    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          fontFamily: 'inherit',
        });
        const id = `mmd-${reactId.replace(/:/g, '')}`;
        const { svg: rendered } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Diagram render failed');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-4">
        <p className="text-xs text-amber-200 mb-2">Diagram preview unavailable</p>
        <pre className="text-[11px] text-zinc-400 overflow-x-auto whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  return (
    <div>
      <div
        className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 overflow-x-auto [&_svg]:max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {caption ? <p className="mt-2 text-xs text-zinc-500">{caption}</p> : null}
    </div>
  );
}
