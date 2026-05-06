// src/pages/AptitudePage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../context/SessionContext';
import { generateAptitudeQuestions, submitAptitudeTest } from '../utils/api';
import { useProctoring } from '../hooks/useProctoring';
import Navbar from '../components/shared/Navbar';
import ProctoringPanel from '../components/proctoring/ProctoringPanel';
import Timer from '../components/shared/Timer';
import LoadingScreen from '../components/shared/LoadingScreen';

export default function AptitudePage() {
  const navigate = useNavigate();
  const { sessionId, setAptitudeResults } = useSession();
  const [phase, setPhase] = useState('setup'); // setup | test | results
  const [numQuestions, setNumQuestions] = useState(10);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [hintsUsed, setHintsUsed] = useState({});
  const [showHint, setShowHint] = useState(false);
  const [timeLimit, setTimeLimit] = useState(600);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const startTimeRef = useRef(Date.now());

  const { videoRef, cameraReady, permissionError, warnings, requestFullscreen } = useProctoring({
    sessionId, round: 'round1', enabled: phase === 'test'
  });

  useEffect(() => {
    if (!sessionId) navigate('/resume');
  }, [sessionId, navigate]);

  // Fisher-Yates shuffle
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const handleStart = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await generateAptitudeQuestions(sessionId, numQuestions);
      setQuestions(res.questions || []);
      setTimeLimit(res.timeLimit || numQuestions * 60);
      setPhase('test');
      startTimeRef.current = Date.now();
    } catch (err) {
      alert('Failed to generate questions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qId, optionIdx) => {
    setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
    setShowHint(false);
  };

  const handleHint = () => {
    const q = questions[currentIdx];
    if (!hintsUsed[q.id]) setHintsUsed(prev => ({ ...prev, [q.id]: true }));
    setShowHint(true);
  };

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitted(true);
    setLoading(true);
    try {
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      const answersArr = questions.map(q => ({
        questionId: q.id,
        selectedAnswer: answers[q.id] ?? -1,
        usedHint: !!hintsUsed[q.id],
        timeSpent: 0
      }));
      const res = await submitAptitudeTest(sessionId, answersArr, timeSpent);
      setResults(res);
      setAptitudeResults(res);
      setPhase('results');
      // Exit fullscreen
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    } catch (err) {
      alert('Submission error: ' + err.message);
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  }, [submitted, questions, answers, hintsUsed, sessionId, setAptitudeResults]);

  const q = questions[currentIdx];
  const answered = Object.keys(answers).length;

  if (loading) return <LoadingScreen message={phase === 'setup' ? 'Generating Questions…' : 'Submitting Test…'} sub="AI is crafting personalized questions" />;

  // ── Setup Phase ───────────────────────────────────────────────────────────
  if (phase === 'setup') return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <Navbar currentStep={2} />
      <div className="max-w-2xl mx-auto px-4 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100">
          <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif', color: '#0a0a5c' }}>
            Aptitude Test Setup
          </h1>
          <p className="text-gray-500 mb-8">Configure your test. Proctoring will activate automatically.</p>

          <div className="mb-6">
            <label className="font-semibold text-gray-700 block mb-3">Number of Questions</label>
            <div className="flex items-center gap-4">
              <input type="range" min="5" max="50" value={numQuestions}
                onChange={e => setNumQuestions(Number(e.target.value))}
                className="flex-1 accent-orange-500" style={{ accentColor: '#ff5722' }} />
              <span className="text-2xl font-black w-12 text-center" style={{ color: '#0a0a5c', fontFamily: 'Syne, sans-serif' }}>{numQuestions}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5</span><span>50</span></div>
          </div>

          {/* Distribution */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(10,10,92,0.05)' }}>
              <div className="text-2xl font-black" style={{ color: '#0a0a5c', fontFamily: 'Syne, sans-serif' }}>{Math.round(numQuestions * 0.7)}</div>
              <div className="text-sm text-gray-600">General Aptitude (70%)</div>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,87,34,0.05)' }}>
              <div className="text-2xl font-black" style={{ color: '#ff5722', fontFamily: 'Syne, sans-serif' }}>{numQuestions - Math.round(numQuestions * 0.7)}</div>
              <div className="text-sm text-gray-600">Resume-Based (30%)</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
            <p className="text-sm font-semibold text-amber-800 mb-2">⚠️ Proctoring Requirements</p>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• Camera & microphone access required</li>
              <li>• Tab switching is monitored and logged</li>
              <li>• Fullscreen mode will be enforced</li>
              <li>• Using hints deducts 0.5 marks</li>
              <li>• Pass threshold: 50%</li>
            </ul>
          </div>

          <motion.button onClick={handleStart} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl text-white font-bold text-lg"
            style={{ background: '#ff5722', fontFamily: 'Syne, sans-serif' }}>
            🚀 Start Test
          </motion.button>
        </motion.div>
      </div>
    </div>
  );

  // ── Results Phase ─────────────────────────────────────────────────────────
  if (phase === 'results' && results) return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <Navbar currentStep={2} />
      <div className="max-w-2xl mx-auto px-4 py-16">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl shadow-lg p-8 text-center border border-gray-100">
          <div className="text-6xl mb-4">{results.passed ? '🎉' : '😞'}</div>
          <h2 className="text-3xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif', color: results.passed ? '#10b981' : '#ef4444' }}>
            {results.passed ? 'Round 1 Passed!' : 'Round 1 Failed'}
          </h2>
          <p className="text-gray-500 mb-8">{results.message}</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-gray-50">
              <div className="text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: '#0a0a5c' }}>{results.score}/{results.maxScore}</div>
              <div className="text-xs text-gray-500">Score</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <div className="text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: '#ff5722' }}>{results.percentage}%</div>
              <div className="text-xs text-gray-500">Percentage</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50">
              <div className="text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: results.passed ? '#10b981' : '#ef4444' }}>
                {results.passed ? 'PASS' : 'FAIL'}
              </div>
              <div className="text-xs text-gray-500">Status</div>
            </div>
          </div>

          {/* Answer Review */}
          <div className="text-left max-h-64 overflow-y-auto mb-6 space-y-2">
            {(results.processedAnswers || []).map((a, i) => (
              <div key={i} className={`p-3 rounded-xl text-sm ${a.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2">
                  <span>{a.isCorrect ? '✅' : '❌'}</span>
                  <span className="font-medium text-gray-700">Q{i + 1}</span>
                  {a.usedHint && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">-0.5 hint</span>}
                  <span className="ml-auto font-bold" style={{ color: a.isCorrect ? '#10b981' : '#ef4444' }}>+{a.score}</span>
                </div>
                {!a.isCorrect && a.explanation && <p className="text-xs text-gray-500 mt-1 ml-6">{a.explanation}</p>}
              </div>
            ))}
          </div>

          {results.passed ? (
            <motion.button onClick={() => navigate('/coding')} whileHover={{ scale: 1.02 }}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg"
              style={{ background: '#0a0a5c', fontFamily: 'Syne, sans-serif' }}>
              Continue to Coding Round →
            </motion.button>
          ) : (
            <motion.button onClick={() => navigate('/')} whileHover={{ scale: 1.02 }}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg"
              style={{ background: '#ef4444', fontFamily: 'Syne, sans-serif' }}>
              Return Home & Try Again
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );

  // ── Test Phase ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <Navbar currentStep={2} />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Top bar */}
            <div className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-700" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Q {currentIdx + 1} / {questions.length}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  q?.category === 'aptitude' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {q?.category === 'aptitude' ? '🧠 Aptitude' : '💼 Resume-Based'}
                </span>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{q?.difficulty}</span>
              </div>
              <Timer totalSeconds={timeLimit} onTimeUp={handleSubmit} />
            </div>

            {/* Progress */}
            <div className="bg-white rounded-xl px-6 py-3 shadow-sm border border-gray-100">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{answered} answered</span>
                <span>{questions.length - answered} remaining</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div className="h-full rounded-full" style={{ background: '#ff5722' }}
                  animate={{ width: `${(answered / questions.length) * 100}%` }} />
              </div>
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
              {q && (
                <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                  <p className="text-lg font-semibold text-gray-800 mb-6 leading-relaxed">{q.question}</p>
                  <div className="space-y-3">
                    {(q.options || []).map((opt, i) => {
                      const selected = answers[q.id] === i;
                      return (
                        <motion.button key={i} onClick={() => handleAnswer(q.id, i)}
                          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all font-medium ${
                            selected ? 'border-accent text-white shadow-md' : 'border-gray-200 hover:border-primary text-gray-700 hover:bg-gray-50'
                          }`}
                          style={selected ? { background: '#0a0a5c', borderColor: '#0a0a5c' } : {}}>
                          {opt}
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Hint */}
                  <div className="mt-6 flex items-center gap-4">
                    <button onClick={handleHint}
                      className={`text-sm px-4 py-2 rounded-xl border transition-all ${
                        hintsUsed[q.id] ? 'bg-yellow-50 border-yellow-300 text-yellow-700' : 'border-gray-200 text-gray-500 hover:border-yellow-300 hover:text-yellow-600'
                      }`}>
                      💡 {hintsUsed[q.id] ? 'Hint used (-0.5)' : 'Show Hint (-0.5)'}
                    </button>
                  </div>
                  <AnimatePresence>
                    {showHint && q.hint && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                        💡 {q.hint}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex gap-3">
              <button onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); setShowHint(false); }}
                disabled={currentIdx === 0}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold disabled:opacity-40 hover:border-gray-300 transition-all">
                ← Previous
              </button>
              {currentIdx < questions.length - 1 ? (
                <button onClick={() => { setCurrentIdx(i => i + 1); setShowHint(false); }}
                  className="flex-1 py-3 rounded-xl text-white font-semibold transition-all"
                  style={{ background: '#0a0a5c' }}>
                  Next →
                </button>
              ) : (
                <motion.button onClick={handleSubmit} whileHover={{ scale: 1.02 }}
                  className="flex-1 py-3 rounded-xl text-white font-semibold"
                  style={{ background: '#ff5722' }}>
                  Submit Test ✓
                </motion.button>
              )}
            </div>

            {/* Question navigator */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-3">Question Navigator</p>
              <div className="flex flex-wrap gap-2">
                {questions.map((_, i) => (
                  <button key={i} onClick={() => { setCurrentIdx(i); setShowHint(false); }}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      i === currentIdx ? 'text-white shadow-md scale-110' :
                      answers[questions[i]?.id] !== undefined ? 'bg-green-100 text-green-700 border border-green-300' :
                      'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    style={i === currentIdx ? { background: '#ff5722' } : {}}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Proctoring Panel */}
          <div className="space-y-4">
            <ProctoringPanel videoRef={videoRef} cameraReady={cameraReady} warnings={warnings} permissionError={permissionError} />
            <motion.button onClick={handleSubmit} whileHover={{ scale: 1.02 }}
              className="w-full py-3 rounded-xl text-white font-bold text-sm"
              style={{ background: '#ff5722' }}>
              Submit Early
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
