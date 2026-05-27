'use client';

import React, { useState } from 'react';
import VisualCanvas from '@/components/visual-explanation/VisualCanvas';

const sampleVisual = {
  nodes: [
    { id: 'n1', label: 'Sunlight', x: 40, y: 24, w: 140, h: 48, metadata: { note: 'Source of energy' } },
    { id: 'n2', label: 'Chloroplast', x: 240, y: 24, w: 160, h: 48, metadata: { note: 'Site of photosynthesis' } },
    { id: 'n3', label: 'Glucose', x: 460, y: 24, w: 140, h: 48, metadata: { note: 'Product stored as sugar' } }
  ],
  edges: [
    { id: 'e1', from: 'n1', to: 'n2', animated: true },
    { id: 'e2', from: 'n2', to: 'n3', animated: false }
  ],
  steps: [
    { id: 's1', title: 'Energy', highlightNodes: ['n1'], narrative: 'Light provides energy to chloroplasts.' },
    { id: 's2', title: 'Conversion', highlightNodes: ['n2'], narrative: 'Chloroplasts convert light to chemical energy.' },
    { id: 's3', title: 'Storage', highlightNodes: ['n3'], narrative: 'Glucose is produced and stored.' }
  ]
};

export default function DemoPage() {
  const [topic, setTopic] = useState('How does photosynthesis work?');
  const [visual, setVisual] = useState(sampleVisual);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch('/api/visual-explain/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic }) });
      const json = await res.json();
      if (json?.success) setVisual(json.visual);
      else alert('Generation failed: ' + (json.error || 'unknown'));
    } catch (e) {
      alert('Request failed: ' + e.message);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: 'white' }}>Visual Explanation Demo</h1>
      <div style={{ margin: '12px 0', display: 'flex', gap: 8 }}>
        <input value={topic} onChange={e => setTopic(e.target.value)} style={{ flex: 1, padding: 8 }} />
        <button onClick={generate} disabled={loading} style={{ padding: '8px 12px' }}>{loading ? 'Generating…' : 'Generate'}</button>
      </div>

      {visual ? <VisualCanvas visual={visual} /> : <div style={{ color: '#9ca3af' }}>No visual yet — click Generate</div>}
    </div>
  );
}
