// src/components/shared/Navbar.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';

const STEPS = [
  { id: 'resume',    label: 'Resume',    num: 1 },
  { id: 'aptitude',  label: 'Aptitude',  num: 2 },
  { id: 'coding',    label: 'Coding',    num: 3 },
  { id: 'interview', label: 'Interview', num: 4 },
  { id: 'results',   label: 'Results',   num: 5 },
];

export default function Navbar({ currentStep }) {
  const navigate = useNavigate();
  const { resetSession } = useSession();

  const handleReset = () => {
    if (window.confirm('Start over? All progress will be lost.')) {
      resetSession();
      navigate('/');
    }
  };

  return (
    <nav
      style={{ background: '#0a0a5c' }}
      className="sticky top-0 z-50 shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <button onClick={handleReset} className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm" style={{ background: '#ff5722' }}>
            AI
          </div>
          <span className="text-white font-bold text-sm hidden sm:block" style={{ fontFamily: 'Syne, sans-serif' }}>
            Interview Prep
          </span>
        </button>

        {/* Progress Steps */}
        <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto">
          {STEPS.map((step, idx) => {
            const isDone = currentStep > step.num;
            const isActive = currentStep === step.num;
            return (
              <React.Fragment key={step.id}>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isActive ? 'bg-accent text-white' :
                  isDone ? 'bg-green-500/20 text-green-300' :
                  'bg-white/10 text-white/50'
                }`} style={isActive ? { background: '#ff5722' } : {}}>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${
                    isDone ? 'bg-green-500 text-white' :
                    isActive ? 'bg-white text-accent' :
                    'bg-white/20 text-white/60'
                  }`}>
                    {isDone ? '✓' : step.num}
                  </span>
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`h-px w-4 sm:w-8 transition-all ${isDone ? 'bg-green-500' : 'bg-white/20'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Reset button */}
        <button
          onClick={handleReset}
          className="shrink-0 text-white/60 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/40 transition-all"
        >
          Restart
        </button>
      </div>
    </nav>
  );
}
