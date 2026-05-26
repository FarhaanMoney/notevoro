"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

export default function QuestionCard({ question, options = [], onSelect, selected }) {
  return (
    <div>
      <div className="text-sm text-zinc-300 mb-3">{question}</div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`text-left p-3 rounded-lg transition-shadow border ${selected === opt ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white border-transparent shadow-lg' : 'bg-white/[0.02] border-white/6 text-zinc-200'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
