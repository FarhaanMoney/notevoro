'use client';

import React from 'react';

export default function LessonCard({ title, desc, meta }) {
  return (
    <div className="p-3 rounded-lg bg-[#031226] border border-white/6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{title}</div>
          {desc && <div className="text-sm text-zinc-400">{desc}</div>}
        </div>
        <div className="text-xs text-zinc-500">{meta}</div>
      </div>
    </div>
  );
}
