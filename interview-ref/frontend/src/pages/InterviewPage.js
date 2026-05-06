// src/pages/InterviewPage.js
// Feature 3: AI HR Round with real-time emotion analysis + end report
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '../context/SessionContext';
import { generateInterviewQuestions, analyzeInterviewResponse, completeInterview, saveEmotionReport } from '../utils/api';
import { useProctoring } from '../hooks/useProctoring';
import { useSpeech } from '../hooks/useSpeech';
import { useEmotionAnalysis } from '../hooks/useEmotionAnalysis';
import Navbar from '../components/shared/Navbar';
import ProctoringPanel from '../components/proctoring/ProctoringPanel';
import EmotionPanel from '../components/emotion/EmotionPanel';
import EmotionReport from '../components/emotion/EmotionReport';
import LoadingScreen from '../components/shared/LoadingScreen';

export default function InterviewPage() {
  const navigate = useNavigate();
  const { sessionId, setInterviewResults } = useSession();
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [analyses, setAnalyses] = useState({});
  const [typedAnswer, setTypedAnswer] = useState('');
  const [inputMode, setInputMode] = useState('voice');
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showEmotionReport, setShowEmotionReport] = useState(false);
  const [emotionReport, setEmotionReport] = useState(null);
  const textareaRef = useRef(null);

  const { videoRef, cameraReady, permissionError, warnings, requestFullscreen } = useProctoring({
    sessionId, round: 'round3', enabled: true,
  });

  const { speak, stopSpeaking, isSpeaking, startListening, stopListening, isListening, transcript, setTranscript } = useSpeech();

  // Feature 3: Emotion analysis
  const {
    isLoaded: emotionLoaded,
    faceDetected,
    currentEmotion,
    emotionLabel,
    confidence,
    nervousness,
    emotionHistory,
    generateReport,
  } = useEmotionAnalysis({ videoRef, enabled: cameraReady });

  useEffect(() => {
    if (!sessionId) { navigate('/resume'); return; }
    (async () => {
      try {
        const res = await generateInterviewQuestions(sessionId);
        setQuestions(res.questions || []);
        setTimeout(() => {
          if (res.questions?.[0]) speak(res.questions[0].question);
        }, 1500);
      } catch (err) {
        alert('Failed to load questions: ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, navigate, requestFullscreen, speak]);

  const currentQ = questions[currentIdx];
  const currentAnswer = answers[currentQ?.id] || '';

  useEffect(() => {
    if (transcript && inputMode === 'voice') setTypedAnswer(transcript);
  }, [transcript, inputMode]);

  const handleStartListening = () => {
    setTranscript('');
    setTypedAnswer('');
    startListening(t => setTypedAnswer(t));
  };

  const handleStopListening = () => stopListening();

  const handleAnalyze = useCallback(async () => {
    const answerText = typedAnswer.trim();
    if (!answerText || !currentQ) return;
    setAnalyzing(true);
    stopSpeaking();
    try {
      const res = await analyzeInterviewResponse(sessionId, currentQ.id, answerText, currentQ.question);
      setAnswers(prev => ({ ...prev, [currentQ.id]: answerText }));
      setAnalyses(prev => ({ ...prev, [currentQ.id]: res }));
      if (res.followUp) {
        setTimeout(() => speak(res.followUp), 500);
        setShowFollowUp(true);
      }
    } catch (err) {
      alert('Analysis error: ' + err.message);
    } finally {
      setAnalyzing(false);
    }
  }, [typedAnswer, currentQ, sessionId, stopSpeaking, speak]);

  const handleNext = () => {
    setShowFollowUp(false);
    setTypedAnswer('');
    setTranscript('');
    stopSpeaking();
    stopListening();
    if (currentIdx < questions.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setTimeout(() => speak(questions[nextIdx].question), 800);
    }
  };

  const handleComplete = async () => {
    stopSpeaking();
    // Generate emotion report before navigating
    const report = generateReport();
    if (report) {
      // Save to backend (fire and forget)
      saveEmotionReport(sessionId, report).catch(() => {});
      setEmotionReport(report);
      setShowEmotionReport(true);
    } else {
      await doComplete();
    }
  };

  const doComplete = async () => {
    setCompleting(true);
    try {
      const res = await completeInterview(sessionId);
      setInterviewResults(res);
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      navigate('/results');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setCompleting(false);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const currentAnalysis = analyses[currentQ?.id];
  const isAnswered = !!answers[currentQ?.id];

  if (loading) return <LoadingScreen message="Preparing Interview…" sub="AI is generating personalized HR questions" />;
  if (completing) return <LoadingScreen message="Completing Interview…" sub="Calculating your performance score" />;

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <Navbar currentStep={4} />

      {/* Emotion Report Modal */}
      <AnimatePresence>
        {showEmotionReport && emotionReport && (
          <EmotionReport
            report={emotionReport}
            onClose={() => { setShowEmotionReport(false); doComplete(); }}
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Main Interview Area */}
          <div className="lg:col-span-3 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 shadow-sm border border-gray-100">
              <div>
                <h1 className="text-xl font-black" style={{ fontFamily: 'Syne, sans-serif', color: '#0a0a5c' }}>
                  AI HR Interview
                </h1>
                <p className="text-sm text-gray-500">Question {currentIdx + 1} of {questions.length}</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Live emotion badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border"
                  style={{ borderColor: emotionLabel?.color + '50', background: emotionLabel?.color + '10' }}>
                  <span className="text-sm">{emotionLabel?.label?.split(' ')[1] || '😐'}</span>
                  <span className="text-xs font-bold" style={{ color: emotionLabel?.color }}>{confidence}%</span>
                </div>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full transition-all"
                      style={{ background: answers[questions[i]?.id] ? '#10b981' : i === currentIdx ? '#ff5722' : '#e5e7eb' }} />
                  ))}
                </div>
                <span className="text-sm text-gray-500">{answeredCount}/{questions.length} answered</span>
              </div>
            </div>

            {/* Question Card */}
            {currentQ && (
              <AnimatePresence mode="wait">
                <motion.div key={currentQ.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                  className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs px-3 py-1 rounded-full font-semibold text-white"
                      style={{ background: currentQ.type === 'intro' ? '#0a0a5c' : currentQ.type === 'behavioral' ? '#ff5722' : '#10b981' }}>
                      {currentQ.type === 'intro' ? '👋 Introduction' : currentQ.type === 'behavioral' ? '🌟 Behavioral' : currentQ.type === 'experience' ? '💼 Experience' : '🎯 Goal-based'}
                    </span>
                    {isSpeaking && (
                      <span className="text-xs text-blue-500 flex items-center gap-1">
                        <span className="animate-pulse">🔊</span> AI Speaking…
                      </span>
                    )}
                    {/* Live emotion chip */}
                    {faceDetected && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
                        {emotionLabel?.label || 'Neutral'}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-gray-800 mb-2 leading-relaxed">{currentQ.question}</h2>
                  <p className="text-xs text-gray-400 mb-6">Evaluation: {currentQ.evaluationCriteria}</p>

                  {/* Follow-up */}
                  <AnimatePresence>
                    {showFollowUp && currentAnalysis?.followUp && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        className="mb-4 p-4 rounded-xl border-l-4 bg-blue-50 border-blue-400">
                        <p className="text-sm font-semibold text-blue-800 mb-1">🤖 AI Follow-up</p>
                        <p className="text-sm text-blue-700">{currentAnalysis.followUp}</p>
                        <button onClick={() => speak(currentAnalysis.followUp)} className="text-xs text-blue-500 mt-1 hover:underline">
                          🔊 Hear again
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {!isAnswered ? (
                    <div className="space-y-4">
                      <div className="flex gap-2 mb-4">
                        {['voice', 'type'].map(mode => (
                          <button key={mode} onClick={() => setInputMode(mode)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                              inputMode === mode ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'
                            }`}
                            style={inputMode === mode ? { background: '#0a0a5c' } : {}}>
                            {mode === 'voice' ? '🎤 Voice Input' : '⌨️ Type Answer'}
                          </button>
                        ))}
                      </div>

                      {inputMode === 'voice' && (
                        <div className="flex flex-col items-center gap-4 py-6 border-2 border-dashed border-gray-200 rounded-xl">
                          <motion.button
                            onClick={isListening ? handleStopListening : handleStartListening}
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all ${
                              isListening ? 'bg-red-500 animate-pulse' : ''
                            }`}
                            style={!isListening ? { background: '#0a0a5c' } : {}}>
                            {isListening ? '⏹' : '🎤'}
                          </motion.button>
                          <p className="text-sm text-gray-500">{isListening ? '🔴 Listening…' : 'Tap to speak'}</p>
                          {typedAnswer && (
                            <div className="w-full p-3 bg-gray-50 rounded-xl text-sm text-gray-700 text-left max-h-32 overflow-y-auto">
                              {typedAnswer}
                            </div>
                          )}
                        </div>
                      )}

                      {inputMode === 'type' && (
                        <textarea ref={textareaRef} value={typedAnswer}
                          onChange={e => setTypedAnswer(e.target.value)}
                          placeholder="Type your answer here…"
                          className="w-full h-40 p-4 border-2 border-gray-200 rounded-xl text-sm text-gray-700 resize-none focus:outline-none focus:border-blue-400 transition-all" />
                      )}

                      <div className="flex gap-3">
                        <motion.button onClick={handleAnalyze}
                          disabled={!typedAnswer.trim() || analyzing}
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          className="flex-1 py-3 rounded-xl text-white font-bold disabled:opacity-40 transition-all"
                          style={{ background: '#ff5722' }}>
                          {analyzing ? '🤖 Analyzing…' : '✓ Submit Answer'}
                        </motion.button>
                        <button onClick={() => speak(currentQ.question)} disabled={isSpeaking}
                          className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 hover:border-gray-300 transition-all">
                          🔊
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 mb-2">YOUR ANSWER</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{currentAnswer}</p>
                      </div>

                      {currentAnalysis && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl border border-gray-200" style={{ background: 'rgba(10,10,92,0.02)' }}>
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-bold text-gray-800 text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>AI Analysis</p>
                            <span className="font-bold text-lg"
                              style={{ color: currentAnalysis.score >= 7 ? '#10b981' : currentAnalysis.score >= 5 ? '#f59e0b' : '#ef4444' }}>
                              {currentAnalysis.score}/10
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{currentAnalysis.analysis}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs font-semibold text-green-700 mb-1">✓ Strengths</p>
                              {(currentAnalysis.strengths || []).map((s, i) => (
                                <p key={i} className="text-xs text-green-600">• {s}</p>
                              ))}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-orange-600 mb-1">↑ Improve</p>
                              {(currentAnalysis.improvements || []).map((s, i) => (
                                <p key={i} className="text-xs text-orange-500">• {s}</p>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div className="flex gap-3">
                        {currentIdx < questions.length - 1 ? (
                          <motion.button onClick={handleNext} whileHover={{ scale: 1.02 }}
                            className="flex-1 py-3 rounded-xl text-white font-bold"
                            style={{ background: '#0a0a5c' }}>
                            Next Question →
                          </motion.button>
                        ) : (
                          <motion.button onClick={handleComplete} whileHover={{ scale: 1.02 }}
                            className="flex-1 py-3 rounded-xl text-white font-bold"
                            style={{ background: '#ff5722' }}>
                            Complete Interview 🎉
                          </motion.button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}

            {/* Question overview */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Questions Overview</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {questions.map((q, i) => (
                  <div key={q.id} className={`p-3 rounded-xl text-xs border ${
                    i === currentIdx ? 'border-accent text-white' :
                    answers[q.id] ? 'bg-green-50 border-green-200 text-green-700' :
                    'bg-gray-50 border-gray-200 text-gray-500'
                  }`} style={i === currentIdx ? { background: '#ff5722', borderColor: '#ff5722' } : {}}>
                    <div className="font-bold mb-1">Q{i + 1}</div>
                    <div className="truncate">{q.type}</div>
                    {answers[q.id] && <div className="text-green-600 font-bold mt-1">✓</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: Proctoring + Emotion */}
          <div className="space-y-4">
            <ProctoringPanel
              videoRef={videoRef}
              cameraReady={cameraReady}
              warnings={warnings}
              permissionError={permissionError}
              sessionId={sessionId}
              round="round3"
            />

            {/* Feature 3: Emotion Panel */}
            <EmotionPanel
              isLoaded={emotionLoaded}
              faceDetected={faceDetected}
              currentEmotion={currentEmotion}
              emotionLabel={emotionLabel}
              confidence={confidence}
              nervousness={nervousness}
              emotionHistory={emotionHistory}
            />

            {answeredCount >= Math.ceil(questions.length * 0.6) && (
              <motion.button onClick={handleComplete} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                whileHover={{ scale: 1.02 }}
                className="w-full py-3 rounded-xl text-white font-bold text-sm"
                style={{ background: '#10b981' }}>
                ✓ Finish Interview
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
