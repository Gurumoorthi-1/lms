// src/pages/CodingPage.js
// Feature 2: Resume-based questions, auto language detection, LeetCode-style layout
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { useSession } from '../context/SessionContext';
import { generateCodingProblems, runCode, submitSolution, completeCodingRound } from '../utils/api';
import { useProctoring } from '../hooks/useProctoring';
import Navbar from '../components/shared/Navbar';
import ProctoringPanel from '../components/proctoring/ProctoringPanel';
import LoadingScreen from '../components/shared/LoadingScreen';

const DIFF_COLORS = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };

// Monaco language ID mapping
const MONACO_LANG_MAP = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  typescript: 'typescript',
};

const LANG_LABELS = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  typescript: 'TypeScript',
};

export default function CodingPage() {
  const navigate = useNavigate();
  const { sessionId, setCodingResults } = useSession();
  const [problems, setProblems] = useState([]);
  const [activeProbIdx, setActiveProbIdx] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [activeTab, setActiveTab] = useState('description'); // description | explanation | examples

  const { videoRef, cameraReady, permissionError, warnings, requestFullscreen } = useProctoring({
    sessionId, round: 'round2', enabled: true,
  });

  useEffect(() => {
    if (!sessionId) { navigate('/resume'); return; }
    (async () => {
      try {
        const res = await generateCodingProblems(sessionId);
        const probs = res.problems || [];
        const lang = res.detectedLanguage || 'javascript';
        setProblems(probs);
        setDetectedLanguage(lang);
        // Load starter code for detected language
        const starter = probs[0]?.starterCode?.[lang] || probs[0]?.starterCode?.javascript || '';
        setCode(starter);
      } catch (err) {
        alert('Failed to load problems: ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, navigate, requestFullscreen]);

  const activeProblem = problems[activeProbIdx];

  const selectProblem = (idx) => {
    setActiveProbIdx(idx);
    setRunResults(null);
    setActiveTab('description');
    const starter = problems[idx]?.starterCode?.[detectedLanguage]
      || problems[idx]?.starterCode?.javascript || '';
    setCode(starter);
  };

  const handleRun = async () => {
    if (!activeProblem || !code.trim()) return;
    setRunning(true);
    setRunResults(null);
    try {
      const res = await runCode(sessionId, activeProblem.id, detectedLanguage, code);
      setRunResults({ ...res, type: 'run' });
    } catch (err) {
      setRunResults({ error: err.message, type: 'run' });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!activeProblem || !code.trim()) return;
    setSubmitting(true);
    try {
      const res = await submitSolution(sessionId, activeProblem.id, detectedLanguage, code);
      setSubmissions(prev => ({ ...prev, [activeProblem.id]: res }));
      setRunResults({ ...res, type: 'submit' });
    } catch (err) {
      setRunResults({ error: err.message, type: 'submit' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await completeCodingRound(sessionId);
      setCodingResults(res);
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      navigate('/interview');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setCompleting(false);
    }
  };

  const solvedCount = Object.values(submissions).filter(s => s.passed).length;

  if (loading) return <LoadingScreen message="Generating Resume-Based Problems…" sub="AI is crafting questions tailored to your exact skills and projects" />;
  if (completing) return <LoadingScreen message="Completing Round 2…" sub="Calculating your coding score" />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0d1117' }}>
      <Navbar currentStep={3} />

      {/* Top tab bar */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center gap-3 flex-wrap">
        {/* Problem tabs */}
        <div className="flex gap-1.5 overflow-x-auto flex-1">
          {problems.map((p, i) => {
            const sub = submissions[p.id];
            return (
              <button
                key={p.id}
                onClick={() => selectProblem(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  i === activeProbIdx
                    ? 'text-white border-transparent'
                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
                }`}
                style={i === activeProbIdx ? { background: '#1f2937', borderColor: '#ff5722' } : {}}
              >
                <span style={{ color: sub ? (sub.passed ? '#10b981' : '#ef4444') : DIFF_COLORS[p.difficulty] }}>
                  {sub ? (sub.passed ? '✓' : '✗') : '○'}
                </span>
                {p.title}
                <span className="text-xs px-1 py-0.5 rounded font-normal"
                  style={{ background: DIFF_COLORS[p.difficulty] + '25', color: DIFF_COLORS[p.difficulty] }}>
                  {p.difficulty}
                </span>
              </button>
            );
          })}
        </div>

        {/* Auto-detected language badge + stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-900/60 border border-blue-700">
            <span className="text-blue-300 text-xs">🧠</span>
            <span className="text-blue-200 text-xs font-semibold">{LANG_LABELS[detectedLanguage] || detectedLanguage}</span>
            <span className="text-blue-400 text-xs">(auto)</span>
          </div>
          <span className="text-gray-400 text-sm font-medium">{solvedCount}/5 solved</span>
          <div className="flex gap-1">
            {problems.map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full transition-all"
                style={{ background: submissions[problems[i]?.id]?.passed ? '#10b981' : submissions[problems[i]?.id] ? '#ef4444' : '#374151' }} />
            ))}
          </div>
          <motion.button onClick={handleComplete} whileHover={{ scale: 1.02 }}
            className="px-4 py-1.5 rounded-lg text-white text-sm font-bold"
            style={{ background: '#ff5722' }}>
            Finish Round →
          </motion.button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {activeProblem && (
          <>
            {/* LEFT: Problem Panel */}
            <div className="w-5/12 border-r border-gray-700 bg-gray-900 overflow-y-auto flex flex-col"
              style={{ minWidth: '340px', maxWidth: '460px' }}>

              {/* Sub-tabs */}
              <div className="flex border-b border-gray-700 px-4 pt-3 gap-1">
                {['description', 'examples', 'hints'].map(tab => (
                  <button key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg capitalize transition-all ${
                      activeTab === tab ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-gray-200'
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-5 flex-1">
                {/* Title + difficulty */}
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-lg font-black text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                    {activeProblem.title}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
                    style={{ background: DIFF_COLORS[activeProblem.difficulty] }}>
                    {activeProblem.difficulty}
                  </span>
                </div>

                {/* Resume relevance badge */}
                {activeProblem.resumeRelevance && (
                  <div className="mb-3 px-3 py-2 rounded-lg bg-blue-900/30 border border-blue-700/50">
                    <p className="text-xs text-blue-300">
                      <span className="font-bold">📋 Resume relevance: </span>
                      {activeProblem.resumeRelevance}
                    </p>
                  </div>
                )}

                {/* Tags */}
                <div className="flex gap-1.5 flex-wrap mb-4">
                  {(activeProblem.tags || []).map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{tag}</span>
                  ))}
                </div>

                {/* Tab content */}
                {activeTab === 'description' && (
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{activeProblem.description}</p>
                )}

                {activeTab === 'examples' && (
                  <div className="space-y-3">
                    {(activeProblem.examples || []).map((ex, i) => (
                      <div key={i} className="p-4 rounded-xl bg-gray-800 border border-gray-700">
                        <p className="text-xs font-bold text-gray-400 mb-2">EXAMPLE {i + 1}</p>
                        <div className="font-mono text-sm space-y-1">
                          <p><span className="text-gray-400">Input:</span> <span className="text-green-300">{ex.input}</span></p>
                          <p><span className="text-gray-400">Output:</span> <span className="text-yellow-300">{ex.output}</span></p>
                          {ex.explanation && (
                            <p className="text-xs text-gray-500 mt-1 pt-1 border-t border-gray-700">
                              💡 {ex.explanation}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Constraints */}
                    <div className="p-3 rounded-lg bg-gray-800 border border-gray-700">
                      <p className="text-xs font-bold text-blue-400 mb-2">CONSTRAINTS</p>
                      {(activeProblem.constraints || []).map((c, i) => (
                        <p key={i} className="text-xs text-gray-400 font-mono">• {c}</p>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'hints' && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-yellow-900/20 border border-yellow-700/40">
                      <p className="text-xs font-bold text-yellow-400 mb-2">💡 Approach Hint</p>
                      <p className="text-sm text-yellow-200">
                        Think about the time complexity first. For {activeProblem.difficulty === 'easy' ? 'easy problems, a simple loop or hash map often works.' :
                          activeProblem.difficulty === 'medium' ? 'medium problems, consider divide-and-conquer or two-pointer approaches.' :
                          'hard problems, consider dynamic programming, graph traversal, or advanced data structures.'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-800 border border-gray-700">
                      <p className="text-xs font-bold text-gray-400 mb-2">🎯 Language: {LANG_LABELS[detectedLanguage]}</p>
                      <p className="text-xs text-gray-500">Auto-selected based on your resume skills. The editor is pre-configured with starter code.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Editor + Output */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
              {/* Editor header — NO language dropdown (Feature 2) */}
              <div className="bg-gray-800 px-4 py-2 flex items-center gap-3 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">Language:</span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold text-white bg-blue-600">
                    {LANG_LABELS[detectedLanguage] || detectedLanguage}
                  </span>
                  <span className="text-gray-500 text-xs italic">Auto-detected from resume</span>
                </div>
                <div className="ml-auto flex gap-2">
                  <motion.button onClick={handleRun} disabled={running || submitting}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-gray-600 hover:bg-gray-500 disabled:opacity-40 transition-all">
                    {running ? '⏳ Running…' : '▶ Run'}
                  </motion.button>
                  <motion.button onClick={handleSubmit} disabled={running || submitting}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-40 transition-all"
                    style={{ background: '#ff5722' }}>
                    {submitting ? '⏳ Submitting…' : '✓ Submit'}
                  </motion.button>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 overflow-hidden" style={{ minHeight: '300px' }}>
                <Editor
                  height="100%"
                  language={MONACO_LANG_MAP[detectedLanguage] || 'javascript'}
                  value={code}
                  onChange={v => setCode(v || '')}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    padding: { top: 12 },
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    automaticLayout: true,
                    tabSize: detectedLanguage === 'python' ? 4 : 2,
                  }}
                />
              </div>

              {/* Test Results */}
              <AnimatePresence>
                {runResults && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-700 bg-gray-900 overflow-y-auto"
                    style={{ maxHeight: '200px' }}>
                    <div className="p-4">
                      {runResults.error ? (
                        <div className="text-red-400 text-sm font-mono">{runResults.error}</div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`font-bold text-sm ${runResults.allPassed || runResults.passed ? 'text-green-400' : 'text-red-400'}`}>
                              {runResults.type === 'submit'
                                ? `${runResults.passed ? '✅ Accepted' : '❌ Wrong Answer'} — ${runResults.passedCount}/${runResults.totalCount} tests`
                                : `${runResults.allPassed ? '✅ All Visible Tests Passed' : '❌ Some Tests Failed'}`}
                            </span>
                            {runResults.timeComplexity && (
                              <span className="text-gray-400 text-xs">
                                Time: {runResults.timeComplexity} | Space: {runResults.spaceComplexity}
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            {(runResults.results || []).map((r, i) => (
                              <div key={i} className={`p-2 rounded-lg text-xs font-mono ${r.passed ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                                <span className="font-bold">{r.passed ? '✓' : '✗'} Case {i + 1}:</span>
                                <span className="ml-2">Input: {r.input} → Expected: {r.expectedOutput} | Got: {r.actualOutput}</span>
                                {r.error && <span className="ml-2 text-red-400">{r.error}</span>}
                              </div>
                            ))}
                          </div>
                          {runResults.feedback && (
                            <p className="text-gray-400 text-xs mt-2">{runResults.feedback}</p>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

        {/* Proctoring Sidebar */}
        <div className="w-52 border-l border-gray-700 bg-gray-900 p-3 shrink-0 overflow-y-auto">
          <ProctoringPanel
            videoRef={videoRef}
            cameraReady={cameraReady}
            warnings={warnings}
            permissionError={permissionError}
            sessionId={sessionId}
            round="round2"
          />
        </div>
      </div>
    </div>
  );
}
