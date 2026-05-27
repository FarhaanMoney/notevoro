'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function Shell({ children }) {
  const [left, right] = React.Children.toArray(children);
  return (
    <div className="h-screen flex gap-4 p-4 md:p-8 bg-[#04050a]">
      <motion.aside initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-96 min-w-[260px] max-w-sm bg-[#071022] rounded-lg p-4 border border-white/6 shadow-lg">
        {left}
      </motion.aside>
      <main className="flex-1 min-h-0 flex flex-col">{right}</main>
    </div>
  );
}
