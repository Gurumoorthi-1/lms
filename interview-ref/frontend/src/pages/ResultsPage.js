// src/pages/ResultsPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { useSession } from '../context/SessionContext';
import { getAnalytics } from '../utils/api';
import Navbar from '../components/shared/Navbar';
import LoadingScreen from '../components/shared/LoadingScreen';

const COLORS = { round1: '#0a0a5c', round2: '#ff5722', round3: '#10b981' };

function ScoreRing({ score, max = 100, color, label, size = 120 }) {
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * score) / max;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }} />
        <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fontSize={size === 120 ? 22 : 16}
          fontWeight="bold" fill={color}>{score}%</text>
      </svg>
      <span className="text-xs font-semibold text-gray-600">{label}</span>
    </div>
  );
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const { sessionId, resetSession } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    (async () => {
      try {
        const res = await getAnalytics(sessionId);
        setData(res);
      } catch (err) {
        console.error('Analytics error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, navigate]);

  if (loading) return <LoadingScreen message="Generating Analytics…" sub="AI is compiling your comprehensive performance report" />;
  if (!data) return <div className="p-8 text-center text-gray-500">Failed to load results</div>;

  const { analytics, roundDetails, resume } = data;
  const passed = analytics.overallPassed;

  const barData = [
    { name: 'Round 1\nAptitude', score: analytics.roundScores.round1, fill: COLORS.round1 },
    { name: 'Round 2\nCoding', score: analytics.roundScores.round2, fill: COLORS.round2 },
    { name: 'Round 3\nInterview', score: analytics.roundScores.round3, fill: COLORS.round3 },
  ];

  const radarData = [
    { subject: 'Aptitude', value: analytics.roundScores.round1 },
    { subject: 'Coding', value: analytics.roundScores.round2 },
    { subject: 'Communication', value: analytics.roundScores.round3 },
    { subject: 'ATS Score', value: resume?.atsScore || 70 },
    { subject: 'Problem Solving', value: Math.round((analytics.roundScores.round2 + analytics.roundScores.round1) / 2) },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fa' }}>
      <Navbar currentStep={5} />

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Hero result banner */}
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="rounded-3xl p-8 text-white text-center shadow-2xl overflow-hidden relative"
          style={{ background: passed ? 'linear-gradient(135deg, #064e3b, #10b981)' : 'linear-gradient(135deg, #7f1d1d, #ef4444)' }}>
          <div className="absolute inset-0 opacity-10">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="absolute rounded-full border border-white"
                style={{ width: `${100 + i * 50}px`, height: `${100 + i * 50}px`,
                  top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%` }} />
            ))}
          </div>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
            className="text-7xl mb-4">{passed ? '🏆' : '📊'}</motion.div>
          <h1 className="text-4xl font-black mb-2" style={{ fontFamily: 'Syne, sans-serif' }}>
            {passed ? 'Congratulations! You\'re Selected!' : 'Interview Complete'}
          </h1>
          <p className="text-lg opacity-90 mb-6">Overall Score: <strong>{analytics.overallScore}%</strong></p>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { label: 'Aptitude', val: analytics.roundScores.round1 + '%', ok: roundDetails.round1.passed },
              { label: 'Coding', val: `${roundDetails.round2.problemsSolved}/5`, ok: roundDetails.round2.passed },
              { label: 'Interview', val: analytics.roundScores.round3 + '%', ok: roundDetails.round3.passed },
            ].map(({ label, val, ok }) => (
              <div key={label} className="bg-white/20 backdrop-blur rounded-2xl px-6 py-4 text-center">
                <div className="text-2xl font-black" style={{ fontFamily: 'Syne, sans-serif' }}>{val}</div>
                <div className="text-sm opacity-80">{label}</div>
                <div className="text-lg mt-1">{ok ? '✅' : '❌'}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
          {['overview', 'details', 'feedback', 'charts', 'proctoring'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize ${
                activeTab === tab ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === tab ? { background: '#0a0a5c' } : {}}>
              {tab === 'overview' ? '📊 Overview' : tab === 'details' ? '📋 Details' : tab === 'feedback' ? '🤖 Feedback' : tab === 'charts' ? '📈 Charts' : '🔒 Proctoring'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-6">
            {/* Score rings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-black text-gray-800 mb-6" style={{ fontFamily: 'Syne, sans-serif' }}>Round Scores</h3>
              <div className="flex justify-around">
                <ScoreRing score={analytics.roundScores.round1} color={COLORS.round1} label="Aptitude" />
                <ScoreRing score={analytics.roundScores.round2} color={COLORS.round2} label="Coding" />
                <ScoreRing score={analytics.roundScores.round3} color={COLORS.round3} label="Interview" />
              </div>
            </div>

            {/* Overall + ATS */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-4">
              <ScoreRing score={analytics.overallScore} color={passed ? '#10b981' : '#ef4444'} label="Overall Score" size={140} />
              <div className="text-center">
                <p className="font-bold text-gray-700">ATS Resume Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                      animate={{ width: `${resume?.atsScore || 70}%` }} transition={{ delay: 0.5, duration: 1 }}
                      style={{ background: resume?.atsScore >= 80 ? '#10b981' : resume?.atsScore >= 60 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <span className="text-sm font-bold">{resume?.atsScore || 70}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-3 gap-5">
            {[
              {
                title: 'Round 1 — Aptitude', icon: '🧠', color: COLORS.round1,
                items: [
                  { label: 'Score', val: `${roundDetails.round1.correctAnswers}/${roundDetails.round1.totalQuestions}` },
                  { label: 'Percentage', val: `${analytics.roundScores.round1}%` },
                  { label: 'Status', val: roundDetails.round1.passed ? '✅ PASS' : '❌ FAIL' },
                ]
              },
              {
                title: 'Round 2 — Coding', icon: '💻', color: COLORS.round2,
                items: [
                  { label: 'Solved', val: `${roundDetails.round2.problemsSolved}/5` },
                  { label: 'Pass Criteria', val: '3/5 needed' },
                  { label: 'Status', val: roundDetails.round2.passed ? '✅ PASS' : '❌ FAIL' },
                ]
              },
              {
                title: 'Round 3 — Interview', icon: '🎙️', color: COLORS.round3,
                items: [
                  { label: 'Avg Score', val: `${roundDetails.round3.avgScore}/10` },
                  { label: 'Percentage', val: `${analytics.roundScores.round3}%` },
                  { label: 'Status', val: roundDetails.round3.passed ? '✅ PASS' : '❌ FAIL' },
                ]
              }
            ].map(card => (
              <div key={card.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: card.color + '15' }}>
                    {card.icon}
                  </div>
                  <h3 className="font-bold text-sm text-gray-800" style={{ fontFamily: 'Syne, sans-serif' }}>{card.title}</h3>
                </div>
                <div className="space-y-3">
                  {card.items.map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">{item.label}</span>
                      <span className="text-sm font-bold text-gray-800">{item.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Skills */}
            <div className="md:col-span-3 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>📌 Your Skills</h3>
              <div className="flex flex-wrap gap-2">
                {(resume?.skills || []).map(s => (
                  <span key={s} className="px-3 py-1.5 rounded-xl text-sm font-medium text-white"
                    style={{ background: '#0a0a5c' }}>{s}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* AI Feedback Tab */}
        {activeTab === 'feedback' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* AI feedback text */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-black text-gray-800 mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>🤖 AI Performance Report</h3>
              <p className="text-gray-600 leading-relaxed">{analytics.aiFeedback}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {[
                { title: '💪 Strengths', items: analytics.strengths, color: 'green', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
                { title: '📉 Weaknesses', items: analytics.weaknesses, color: 'red', bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
                { title: '🔼 Improvements', items: analytics.improvements, color: 'blue', bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
                { title: '🎯 Skill Gaps', items: analytics.skillGaps, color: 'orange', bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
              ].map(({ title, items, bg, border, text }) => (
                <div key={title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  <h4 className="font-bold text-gray-800 mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>{title}</h4>
                  <div className="space-y-2">
                    {(items || []).map((item, i) => (
                      <div key={i} className="flex gap-2 p-2 rounded-lg text-sm"
                        style={{ background: bg, border: `1px solid ${border}`, color: text }}>
                        <span>•</span><span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Next Steps */}
            {analytics.nextSteps && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>🚀 Next Steps</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {analytics.nextSteps.map((step, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: '#0a0a5c' }}>{i + 1}</span>
                      <span className="text-sm text-gray-700">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Charts Tab */}
        {activeTab === 'charts' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>📊 Round Performance</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>🎯 Skill Radar</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar name="Score" dataKey="value" stroke="#0a0a5c" fill="#0a0a5c" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Score breakdown */}
            <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>📈 Score Breakdown</h3>
              <div className="space-y-4">
                {[
                  { label: 'Resume ATS Score', val: resume?.atsScore || 70, color: '#6366f1' },
                  { label: 'Round 1 — Aptitude', val: analytics.roundScores.round1, color: COLORS.round1 },
                  { label: 'Round 2 — Coding', val: analytics.roundScores.round2, color: COLORS.round2 },
                  { label: 'Round 3 — Interview', val: analytics.roundScores.round3, color: COLORS.round3 },
                  { label: 'Overall Score', val: analytics.overallScore, color: passed ? '#10b981' : '#ef4444' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-48 shrink-0">{label}</span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                        animate={{ width: `${val}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                        style={{ background: color }} />
                    </div>
                    <span className="text-sm font-bold w-12 text-right" style={{ color }}>{val}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Proctoring Tab — Features 1 & 3 */}
        {activeTab === 'proctoring' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Violation Summary (Feature 1) */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-black text-gray-800 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
                🔒 Proctoring Summary
              </h3>
              {data.proctoring ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Total Events', value: data.proctoring.totalEvents, color: '#6b7280', icon: '📋' },
                      { label: 'Critical Violations', value: data.proctoring.criticalViolations, color: data.proctoring.criticalViolations > 0 ? '#ef4444' : '#10b981', icon: '🚨' },
                      { label: 'Object Detections', value: data.proctoring.hasObjectDetectionViolations ? 'Yes' : 'None', color: data.proctoring.hasObjectDetectionViolations ? '#ef4444' : '#10b981', icon: '👁' },
                    ].map(({ label, value, color, icon }) => (
                      <div key={label} className="text-center p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="text-2xl mb-1">{icon}</div>
                        <div className="text-xl font-black" style={{ color }}>{value}</div>
                        <div className="text-xs text-gray-500">{label}</div>
                      </div>
                    ))}
                  </div>
                  {Object.keys(data.proctoring.violationSummary || {}).length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-3">Violation Breakdown</p>
                      <div className="space-y-2">
                        {Object.entries(data.proctoring.violationSummary).map(([type, count]) => (
                          <div key={type} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                            <span className="text-sm text-gray-600 capitalize">{type.replace(/_/g, ' ')}</span>
                            <span className="text-sm font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">{count}×</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.proctoring.criticalViolations === 0 && (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                      <p className="text-green-700 font-semibold">✅ No critical violations detected — Clean proctoring record!</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Proctoring data not available.</p>
              )}
            </div>

            {/* Emotion Report (Feature 3) */}
            {data.proctoring?.emotionReport && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-black text-gray-800 mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
                  🧠 Emotion Analysis Report
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  {[
                    { label: 'Avg Confidence', value: `${data.proctoring.emotionReport.avgConf}%`, color: '#10b981', icon: '💪' },
                    { label: 'Avg Nervousness', value: `${data.proctoring.emotionReport.avgNerv}%`, color: '#f59e0b', icon: '😰' },
                    { label: 'Dominant Emotion', value: data.proctoring.emotionReport.dominantOverall || 'neutral', color: '#6366f1', icon: '😊' },
                    { label: 'Trend', value: data.proctoring.emotionReport.nervTrend || 'stable', color: '#3b82f6', icon: '📈' },
                  ].map(({ label, value, color, icon }) => (
                    <div key={label} className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="text-2xl mb-1">{icon}</div>
                      <div className="font-black capitalize" style={{ color }}>{value}</div>
                      <div className="text-xs text-gray-500">{label}</div>
                    </div>
                  ))}
                </div>
                {(data.proctoring.emotionReport.suggestions || []).length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-3">💡 Improvement Suggestions</p>
                    {data.proctoring.emotionReport.suggestions.map((s, i) => (
                      <div key={i} className="flex gap-2 mb-2 text-sm text-gray-600">
                        <span className="text-orange-500 font-bold shrink-0">→</span><span>{s}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center pt-4">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => window.print()}
            className="px-8 py-3 rounded-2xl border-2 font-bold text-gray-700 hover:border-gray-400 transition-all"
            style={{ borderColor: '#0a0a5c', color: '#0a0a5c' }}>
            🖨️ Print Report
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { resetSession(); navigate('/'); }}
            className="px-8 py-3 rounded-2xl text-white font-bold shadow-lg"
            style={{ background: '#ff5722' }}>
            🔄 Start New Interview
          </motion.button>
        </div>
      </div>
    </div>
  );
}
