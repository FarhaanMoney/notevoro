"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

export default function QuestionCard({ question, options = [], onSelect, selected }) {
  return (
    <div>
      <div className="text-sm text-zinc-300 mb-4">{question}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`text-left rounded-3xl p-4 transition border ${selected === opt ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white border-transparent shadow-[0_20px_60px_-40px_rgba(124,58,237,0.7)]' : 'bg-white/[0.03] border-white/10 text-zinc-200 hover:border-white/20 hover:bg-white/10'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
