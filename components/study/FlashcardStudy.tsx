"use client";
import React, { useState } from 'react';

export default function FlashcardStudy() {
  const cards = [
    { id: 1, front: 'What is spaced repetition?', back: 'A technique that spaces reviews to improve retention.' },
    { id: 2, front: 'Active recall?', back: 'Testing yourself to strengthen memory retrieval.' },
  ];
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const next = () => {
    setFlipped(false);
    setIndex((i) => (i + 1) % cards.length);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-start gap-4">
      <h2 className="text-lg font-semibold">Flashcards</h2>
      <div className="w-full max-w-2xl">
        <div
          onClick={() => setFlipped((f) => !f)}
          className="cursor-pointer select-none rounded-lg p-8 text-center shadow-md border bg-[rgba(var(--bg-secondary),0.6)]"
        >
          <div className="text-xl font-medium">{flipped ? cards[index].back : cards[index].front}</div>
        </div>
        <div className="mt-4 flex justify-between">
          <button onClick={() => setIndex((i) => (i - 1 + cards.length) % cards.length)} className="btn">
            Prev
          </button>
          <button onClick={next} className="btn">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
