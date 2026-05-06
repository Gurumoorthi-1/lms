// src/components/shared/Timer.js
import React, { useEffect, useState, useCallback } from 'react';

export default function Timer({ totalSeconds, onTimeUp, paused = false }) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => { setRemaining(totalSeconds); }, [totalSeconds]);

  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) { onTimeUp && onTimeUp(); return; }
    const t = setInterval(() => setRemaining(r => {
      if (r <= 1) { clearInterval(t); onTimeUp && onTimeUp(); return 0; }
      return r - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [paused, remaining, onTimeUp]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  const pct = remaining / totalSeconds;
  const urgent = pct < 0.2;
  const warning = pct < 0.4;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg transition-all ${
      urgent ? 'bg-red-100 text-red-600 animate-pulse' :
      warning ? 'bg-orange-100 text-orange-600' :
      'bg-primary/10 text-primary'
    }`} style={!urgent && !warning ? { color: '#0a0a5c', background: 'rgba(10,10,92,0.08)' } : {}}>
      <span className="text-xl">{urgent ? '🚨' : '⏱'}</span>
      {mins}:{secs}
    </div>
  );
}
