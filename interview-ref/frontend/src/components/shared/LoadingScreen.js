// src/components/shared/LoadingScreen.js
import React from 'react';
import { motion } from 'framer-motion';

export default function LoadingScreen({ message = 'Loading…', sub = '' }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-6"
      >
        {/* Animated logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-xl"
            style={{ background: 'linear-gradient(135deg, #0a0a5c, #ff5722)' }}>
            AI
          </div>
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ border: '3px solid #ff5722' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div className="text-center">
          <motion.p
            className="text-xl font-bold mb-1"
            style={{ fontFamily: 'Syne, sans-serif', color: '#0a0a5c' }}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {message}
          </motion.p>
          {sub && <p className="text-sm text-gray-500">{sub}</p>}
        </div>

        {/* Dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: '#0a0a5c' }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
