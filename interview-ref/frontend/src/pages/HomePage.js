// src/pages/HomePage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSession } from '../context/SessionContext';

const features = [
  { icon: '📄', title: 'AI Resume Analysis', desc: 'ATS score, skills extraction & smart improvement suggestions' },
  { icon: '🧠', title: 'Aptitude Test', desc: '5–50 customizable questions with real-time proctoring' },
  { icon: '💻', title: 'Coding Round', desc: 'LeetCode-style editor with multi-language support' },
  { icon: '🎙️', title: 'HR AI Interview', desc: 'Voice-based Q&A with follow-up questions & analysis' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Detailed performance charts and AI feedback report' },
  { icon: '🎥', title: 'AI Proctoring', desc: 'Face detection, noise monitoring & tab-switch alerts' },
];

const rounds = [
  { num: 1, title: 'Resume + Aptitude', color: '#0a0a5c', items: ['Resume upload & AI analysis', 'ATS scoring', 'Custom aptitude test', 'AI proctoring'] },
  { num: 2, title: 'Technical Coding', color: '#ff5722', items: ['5 AI-generated problems', 'Easy / Medium / Hard', 'Multi-language editor', 'Live test execution'] },
  { num: 3, title: 'HR Interview', color: '#10b981', items: ['Voice Q&A', 'AI follow-ups', 'Real-time analysis', 'Final feedback report'] },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { resetSession } = useSession();

  const handleStart = () => {
    resetSession();
    navigate('/resume');
  };

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      {/* Hero */}
      <section
        className="relative overflow-hidden py-24 px-4"
        style={{ background: 'linear-gradient(135deg, #0a0a5c 0%, #1a1a8c 50%, #0a0a5c 100%)' }}
      >
        {/* BG pattern */}
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white"
              style={{ width: `${60 + i * 30}px`, height: `${60 + i * 30}px`,
                top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, opacity: 0.3 }} />
          ))}
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium mb-8"
            style={{ background: 'rgba(255,87,34,0.3)', border: '1px solid rgba(255,87,34,0.5)' }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            AI-Powered Interview Preparation System
          </motion.div>

          <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight"
            style={{ fontFamily: 'Syne, sans-serif' }}>
            Ace Every<br />
            <span style={{ color: '#ff5722' }}>Interview</span>
          </motion.h1>

          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            3-round AI-powered interview simulation with real proctoring, adaptive questions, and instant performance analytics.
          </motion.p>

          <motion.button initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
            onClick={handleStart}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            className="px-10 py-4 text-white font-bold text-lg rounded-2xl shadow-2xl transition-all"
            style={{ background: '#ff5722', fontFamily: 'Syne, sans-serif' }}>
            🚀 Start Interview
          </motion.button>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-8 mt-16">
            {[['3', 'Interview Rounds'], ['50+', 'Question Types'], ['100%', 'AI Powered'], ['Real-Time', 'Proctoring']].map(([val, label]) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-black text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{val}</div>
                <div className="text-blue-300 text-sm">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Rounds */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12" style={{ fontFamily: 'Syne, sans-serif', color: '#0a0a5c' }}>
            3-Round Interview Process
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {rounds.map((round, i) => (
              <motion.div key={round.num}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-white rounded-2xl p-6 shadow-md card-hover border border-gray-100">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black mb-4"
                  style={{ background: round.color, fontFamily: 'Syne, sans-serif' }}>
                  {round.num}
                </div>
                <h3 className="font-bold text-lg mb-4" style={{ color: round.color, fontFamily: 'Syne, sans-serif' }}>
                  {round.title}
                </h3>
                <ul className="space-y-2">
                  {round.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-gray-600 text-sm">
                      <span className="text-green-500 font-bold">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4" style={{ background: '#fff' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12" style={{ fontFamily: 'Syne, sans-serif', color: '#0a0a5c' }}>
            Platform Features
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }} viewport={{ once: true }}
                className="p-6 rounded-2xl border border-gray-100 card-hover bg-white">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-800 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center" style={{ background: '#0a0a5c' }}>
        <h2 className="text-3xl font-black text-white mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Ready to Begin?
        </h2>
        <p className="text-blue-200 mb-8">Upload your resume and start your AI interview journey</p>
        <motion.button onClick={handleStart} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
          className="px-10 py-4 text-white font-bold text-lg rounded-2xl"
          style={{ background: '#ff5722', fontFamily: 'Syne, sans-serif' }}>
          Get Started Now →
        </motion.button>
      </section>
    </div>
  );
}
