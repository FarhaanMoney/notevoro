"use client";
import React, { useState } from 'react';

export default function MockTestRunner() {
  const questions = [
    { id: 1, q: 'Solve: 5 * 6 = ?', answer: '30' },
    { id: 2, q: 'What is H2O?', answer: 'Water' },
  ];
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const submit = (val: string) => {
    setAnswers((a) => [...a, val]);
    setIdx((i) => i + 1);
  };

  if (idx >= questions.length) {
    return (
      <div className="p-6">
        <h3 className="text-lg font-semibold">Mock Test Finished</h3>
        <pre className="mt-3">{JSON.stringify(answers, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold">{questions[idx].q}</h3>
      <MockInput onSubmit={submit} />
    </div>
  );
}

function MockInput({ onSubmit }: { onSubmit: (v: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="mt-4 flex gap-2">
      <input value={val} onChange={(e) => setVal(e.target.value)} className="flex-1 rounded-md p-2 border" />
      <button onClick={() => { onSubmit(val); setVal(''); }} className="btn">Submit</button>
    </div>
  );
}
