"use client";
import React, { useState } from 'react';

const sample = [
  { id: 1, q: '2 + 2 = ?', choices: ['3', '4', '5'], answer: 1 },
  { id: 2, q: 'Capital of France?', choices: ['London', 'Berlin', 'Paris'], answer: 2 },
];

export default function QuizRunner() {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);

  const submit = (choice: number) => {
    if (choice === sample[idx].answer) setScore((s) => s + 1);
    setIdx((i) => i + 1);
  };

  if (idx >= sample.length) {
    return (
      <div className="p-6">
        <h3 className="text-xl font-semibold">Quiz complete</h3>
        <p className="mt-2">Score: {score}/{sample.length}</p>
      </div>
    );
  }

  const cur = sample[idx];

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold">{cur.q}</h3>
      <div className="mt-4 flex flex-col gap-2">
        {cur.choices.map((c, i) => (
          <button key={i} onClick={() => submit(i)} className="rounded-md p-3 text-left border">
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
